// backend/utils/potUtils.js
const { Pot, PotsUser } = require('../db/models');

/**
 * Recalculates and updates a pot's total amount, end date, and all member draw dates.
 * This should be called anytime members are added, removed, or reordered.
 * @param {number} potId The ID of the pot to update.
 * @param {import('sequelize').Transaction} transaction The Sequelize transaction object.
 * @returns {Promise<import('../db/models/pot')>} The updated pot instance.
 */
const updatePotScheduleAndDetails = async (potId, transaction) => {
    const t = transaction;

    try {
        const pot = await Pot.findByPk(potId, { transaction: t });
        if (!pot) {
            console.error(`Pot not found with ID: ${potId} for schedule update.`);
            throw new Error('Pot not found during schedule update.');
        }

        if (!pot.startDate) {
            console.warn(`Pot ${potId} has no start date. Cannot calculate schedule.`);
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
                throw new Error('Invalid pot start date found for schedule calculation.');
            }

            for (let i = 0; i < numberOfUsers; i++) {
                const memberEntry = potMembersEntries[i];
                const drawDateUTC = new Date(baseDateUTC.valueOf());
                drawDateUTC.setUTCDate(baseDateUTC.getUTCDate() + (i * 7));

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