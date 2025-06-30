const { Op } = require('sequelize'); // Make sure to import Op from sequelize
const { Pot, PotsUser, BankerPayment } = require('../db/models');

const updatePotScheduleAndDetails = async (potId, transaction) => {
    const t = transaction;
    try {
        const pot = await Pot.findByPk(potId, { transaction: t });
        if (!pot) throw new Error('Pot not found during schedule update.');

        // -----------------------------------------------------------------
        // We will REMOVE the aggressive BankerPayment.destroy call from here.
        // -----------------------------------------------------------------

        if (!pot.startDate) {
            pot.amount = 0;
            pot.endDate = pot.startDate;
            await pot.save({ transaction: t });
            return pot;
        }

        const potMembersEntries = await PotsUser.findAll({
            where: { potId: pot.id },
            order: [['displayOrder', 'ASC']],
            transaction: t
        });

        const numberOfUsers = potMembersEntries.length;
        const potStartDateString = pot.startDate;
        let calculatedPotEndDate = potStartDateString;
        const calculatedDrawDates = []; // Keep track of all valid draw dates

        if (numberOfUsers > 0) {
            const [startYear, startMonth, startDay] = potStartDateString.split('-').map(Number);
            const baseDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay));

            if (isNaN(baseDateUTC.getTime())) {
                throw new Error('Invalid pot start date for schedule calculation.');
            }
            
            // This is the amount due from the banker to the company per draw
            const amountDuePerUser = parseFloat(pot.subscriptionFee) || 0;

            for (let i = 0; i < numberOfUsers; i++) {
                const memberEntry = potMembersEntries[i];
                const drawDateUTC = new Date(baseDateUTC.valueOf());

                switch (pot.frequency) {
                    case 'monthly':
                        drawDateUTC.setUTCMonth(baseDateUTC.getUTCMonth() + i);
                        break;
                    case 'every-2-weeks':
                        drawDateUTC.setUTCDate(baseDateUTC.getUTCDate() + (i * 14));
                        break;
                    case 'weekly':
                    default:
                        drawDateUTC.setUTCDate(baseDateUTC.getUTCDate() + (i * 7));
                        break;
                }

                const dYear = drawDateUTC.getUTCFullYear();
                const dMonth = (drawDateUTC.getUTCMonth() + 1).toString().padStart(2, '0');
                const dDay = drawDateUTC.getUTCDate().toString().padStart(2, '0');
                memberEntry.drawDate = `${dYear}-${dMonth}-${dDay}`;
                await memberEntry.save({ transaction: t });

                calculatedDrawDates.push(memberEntry.drawDate); // Add date to our list of valid dates

                // --- SOLUTION: Replace .create() with .findOrCreate() ---
                // This will find the payment if it exists, or create it if it's new.
                // Crucially, it will NOT overwrite the status of an existing 'paid' payment.
                await BankerPayment.findOrCreate({
                    where: {
                        potId: pot.id,
                        drawDate: memberEntry.drawDate,
                    },
                    defaults: {
                        bankerId: pot.ownerId,
                        amountDue: amountDuePerUser,
                        status: 'due' // This is ONLY used if the record is new
                    },
                    transaction: t
                });

                if (i === numberOfUsers - 1) {
                    calculatedPotEndDate = memberEntry.drawDate;
                }
            }
            pot.endDate = calculatedPotEndDate;
            pot.amount = parseFloat(pot.hand) * numberOfUsers;
        } else {
            pot.endDate = potStartDateString;
            pot.amount = 0;
        }
        
        // --- NEW: Clean up orphaned "due" payments ---
        // This will destroy any "due" payments that are no longer part of the schedule
        // (e.g., if a user was removed from the pot). It will not touch "paid" payments.
        await BankerPayment.destroy({
            where: {
                potId: pot.id,
                status: 'due',
                drawDate: { [Op.notIn]: calculatedDrawDates } // 'notIn' our list of valid dates
            },
            transaction: t
        });

        await pot.save({ transaction: t });
        return pot;

    } catch (error) {
        console.error(`Error in updatePotScheduleAndDetails for potId ${potId}:`, error);
        throw error;
    }
};

module.exports = {
    updatePotScheduleAndDetails
};