// backend/utils/potUtils.js
const { Pot, PotsUser } = require('../db/models');

const updatePotScheduleAndDetails = async (potId, transaction) => {
    const t = transaction;
    try {
        const pot = await Pot.findByPk(potId, { transaction: t });
        if (!pot) throw new Error('Pot not found during schedule update.');
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

        if (numberOfUsers > 0) {
            const [startYear, startMonth, startDay] = potStartDateString.split('-').map(Number);
            const baseDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay));

            if (isNaN(baseDateUTC.getTime())) {
                throw new Error('Invalid pot start date for schedule calculation.');
            }

            for (let i = 0; i < numberOfUsers; i++) {
                const memberEntry = potMembersEntries[i];
                const drawDateUTC = new Date(baseDateUTC.valueOf());

                // ✅ NEW: Calculate date based on frequency
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