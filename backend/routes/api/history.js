// backend/routes/api/history.js 
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../../utils/auth');
const { PERMISSIONS } = require('../../utils/roles');
const { TransactionHistory, User, Pot } = require('../../db/models');
const { Op } = require('sequelize');

// Helper functions
function getCategory(actionType) {
    const categories = {
        'pot_management': ['CREATE_POT', 'UPDATE_POT', 'DELETE_POT', 'POT_COMPLETED', 'POT_CANCELLED'],
        'member_management': ['JOIN_POT', 'LEAVE_POT', 'KICK_USER'],
        'financial': ['MAKE_PAYMENT', 'TRANSFER', 'REFUND'],
        'user_management': ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ROLE_CHANGE'],
        'system': ['LOGIN', 'LOGOUT', 'PAYMENT_REMINDER']
    };

    for (const [category, actions] of Object.entries(categories)) {
        if (actions.includes(actionType)) return category;
    }
    return 'other';
}

function getPriority(actionType) {
    const highPriority = ['DELETE_POT', 'DELETE_USER', 'KICK_USER', 'POT_CANCELLED'];
    const mediumPriority = ['CREATE_POT', 'ROLE_CHANGE', 'TRANSFER', 'REFUND'];
    
    if (highPriority.includes(actionType)) return 'high';
    if (mediumPriority.includes(actionType)) return 'medium';
    return 'low';
}

function isFinancial(actionType) {
    return ['MAKE_PAYMENT', 'TRANSFER', 'REFUND', 'POT_COMPLETED'].includes(actionType);
}

function generateSmartDescription(record) {
    const user = record.userPerformingAction;
    const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
    const potName = record.relatedPot?.name || 'Unknown Pot';
    
    // If there's already a description, use it
    if (record.description && record.description.trim()) {
        return record.description;
    }
    
    // Generate smart descriptions based on action type
    switch (record.actionType) {
        case 'CREATE_POT':
            const targetAmount = record.changes?.targetAmount ? ` with a target of $${record.changes.targetAmount}` : '';
            return `${userName} created a new savings pot "${potName}"${targetAmount}`;
            
        case 'UPDATE_POT':
            return `${userName} modified the savings pot "${potName}"`;
            
        case 'DELETE_POT':
            return `${userName} deleted the savings pot "${potName}"`;
            
        case 'POT_COMPLETED':
            const finalAmount = record.extractedAmount ? ` Final amount: $${record.extractedAmount}` : '';
            return `Savings pot "${potName}" was completed successfully.${finalAmount}`;
            
        case 'POT_CANCELLED':
            return `Savings pot "${potName}" was cancelled`;
            
        case 'JOIN_POT':
            return `${userName} joined the savings pot "${potName}"`;
            
        case 'LEAVE_POT':
            return `${userName} left the savings pot "${potName}"`;
            
        case 'KICK_USER':
            return `A member was removed from "${potName}" by ${userName}`;
            
        case 'MAKE_PAYMENT':
            const amount = record.extractedAmount ? `$${record.extractedAmount}` : 'a payment';
            return `${userName} made a payment of ${amount} to "${potName}"`;
            
        case 'TRANSFER':
            const transferAmount = record.extractedAmount ? `$${record.extractedAmount}` : 'funds';
            return `${userName} transferred ${transferAmount}`;
            
        case 'REFUND':
            const refundAmount = record.extractedAmount ? `$${record.extractedAmount}` : 'a refund';
            return `${userName} processed a refund of ${refundAmount}`;
            
        case 'CREATE_USER':
            return `${userName} created a new user account`;
            
        case 'UPDATE_USER':
            return `${userName} updated a user profile`;
            
        case 'DELETE_USER':
            return `${userName} deleted a user account`;
            
        case 'ROLE_CHANGE':
            const newRole = record.changes?.newRole || 'new role';
            return `${userName} changed a user's role to ${newRole}`;
            
        case 'LOGIN':
            return `${userName} logged into the system`;
            
        case 'LOGOUT':
            return `${userName} logged out of the system`;
            
        case 'PAYMENT_REMINDER':
            return `Payment reminder sent for "${potName}"`;
            
        default:
            return `${userName} performed ${record.actionType.toLowerCase().replace(/_/g, ' ')}`;
    }
}

// Enhanced main route with filtering and search
router.get('/', requireAuth, requirePermission(PERMISSIONS.VIEW_TRANSACTION_HISTORY), async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;
    
    // Extract filter parameters
    const {
        search,
        actionType,
        entityType,
        userId,
        potId,
        startDate,
        endDate,
        category,
        priority
    } = req.query;

    try {
        console.log('🔍 Fetching transaction history with filters...');
        
        // Build where conditions for filtering
        const whereConditions = {};
        
        // Date range filtering
        if (startDate || endDate) {
            whereConditions.createdAt = {};
            if (startDate) {
                whereConditions.createdAt[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                whereConditions.createdAt[Op.lte] = new Date(endDate);
            }
        }
        
        // Action type filtering
        if (actionType) {
            whereConditions.actionType = actionType;
        }
        
        // Entity type filtering
        if (entityType) {
            whereConditions.entityType = entityType;
        }
        
        // User filtering
        if (userId) {
            whereConditions.userId = parseInt(userId);
        }
        
        // Pot filtering
        if (potId) {
            whereConditions.potIdContext = parseInt(potId);
        }
        
        // Category filtering (map category back to action types)
        if (category) {
            const categoryMapping = {
                'pot_management': ['CREATE_POT', 'UPDATE_POT', 'DELETE_POT', 'POT_COMPLETED', 'POT_CANCELLED'],
                'member_management': ['JOIN_POT', 'LEAVE_POT', 'KICK_USER'],
                'financial': ['MAKE_PAYMENT', 'TRANSFER', 'REFUND'],
                'user_management': ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ROLE_CHANGE'],
                'system': ['LOGIN', 'LOGOUT', 'PAYMENT_REMINDER']
            };
            
            if (categoryMapping[category]) {
                whereConditions.actionType = {
                    [Op.in]: categoryMapping[category]
                };
            }
        }
        
        // Text search across description and action type
        if (search) {
            whereConditions[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { actionType: { [Op.like]: `%${search}%` } },
                { entityType: { [Op.like]: `%${search}%` } }
            ];
        }
        
        // Get total count with filters
        const totalCount = await TransactionHistory.count({
            where: whereConditions
        });
        console.log(`📊 Total filtered records: ${totalCount}`);
        
        // Get filtered records
        const basicRecords = await TransactionHistory.findAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
        console.log(`📋 Retrieved ${basicRecords.length} filtered records`);

        // Enrich records with user and pot data
        const enrichedRecords = [];
        for (const record of basicRecords) {
            const enrichedRecord = record.toJSON();
            
            // Get user data manually
            if (enrichedRecord.userId) {
                try {
                    const user = await User.findByPk(enrichedRecord.userId, {
                        attributes: ['id', 'username', 'firstName', 'lastName', 'email']
                    });
                    if (user) {
                        enrichedRecord.userPerformingAction = user.toJSON();
                    }
                } catch (userError) {
                    console.warn(`⚠️ Could not fetch user ${enrichedRecord.userId}:`, userError.message);
                }
            }

            // Get pot data manually
            if (enrichedRecord.potIdContext) {
                try {
                    const pot = await Pot.findByPk(enrichedRecord.potIdContext, {
                        attributes: ['id', 'name']
                    });
                    if (pot) {
                        enrichedRecord.relatedPot = pot.toJSON();
                    }
                } catch (potError) {
                    console.warn(`⚠️ Could not fetch pot ${enrichedRecord.potIdContext}:`, potError.message);
                }
            }

            // Add computed fields
            enrichedRecord.category = getCategory(enrichedRecord.actionType);
            enrichedRecord.priority = getPriority(enrichedRecord.actionType);
            enrichedRecord.isFinancial = isFinancial(enrichedRecord.actionType);
            
            // Extract amount from changes
            if (enrichedRecord.changes && typeof enrichedRecord.changes === 'object') {
                enrichedRecord.extractedAmount = enrichedRecord.changes.amount || 
                                               enrichedRecord.changes.paymentAmount || 
                                               enrichedRecord.changes.totalAmount || null;
            }
            
            // Generate smart description
            enrichedRecord.smartDescription = generateSmartDescription(enrichedRecord);
            
            // Filter by priority if specified (since we can't do this in SQL)
            if (priority && enrichedRecord.priority !== priority) {
                continue; // Skip this record
            }
            
            // Additional text search in enriched data
            if (search) {
                const searchLower = search.toLowerCase();
                const userFullName = enrichedRecord.userPerformingAction ? 
                    `${enrichedRecord.userPerformingAction.firstName} ${enrichedRecord.userPerformingAction.lastName}`.toLowerCase() : '';
                const potName = enrichedRecord.relatedPot?.name?.toLowerCase() || '';
                const smartDesc = enrichedRecord.smartDescription?.toLowerCase() || '';
                
                const matchesEnrichedSearch = userFullName.includes(searchLower) ||
                                            potName.includes(searchLower) ||
                                            smartDesc.includes(searchLower);
                
                // If it doesn't match the basic search (which got it this far) or enriched search, skip it
                if (!matchesEnrichedSearch) {
                    const basicMatches = enrichedRecord.description?.toLowerCase().includes(searchLower) ||
                                       enrichedRecord.actionType?.toLowerCase().includes(searchLower) ||
                                       enrichedRecord.entityType?.toLowerCase().includes(searchLower);
                    
                    if (!basicMatches) {
                        continue;
                    }
                }
            }

            enrichedRecords.push(enrichedRecord);
        }

        console.log(`✅ Successfully enriched ${enrichedRecords.length} records`);

        // Calculate comprehensive statistics
        const stats = calculateStatistics(enrichedRecords);

        const response = {
            history: enrichedRecords,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            totalItems: totalCount,
            itemsPerPage: limit,
            statistics: stats
        };

        console.log(`📤 Sending response with ${enrichedRecords.length} records`);
        res.json(response);

    } catch (error) {
        console.error('💥 Error fetching history:', error);
        res.status(500).json({ 
            message: "Failed to fetch transaction history.",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Statistics endpoint
router.get('/statistics', requireAuth, requirePermission(PERMISSIONS.VIEW_TRANSACTION_HISTORY), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const whereConditions = {};
        if (startDate || endDate) {
            whereConditions.createdAt = {};
            if (startDate) whereConditions.createdAt[Op.gte] = new Date(startDate);
            if (endDate) whereConditions.createdAt[Op.lte] = new Date(endDate);
        }

        const records = await TransactionHistory.findAll({
            where: whereConditions
        });

        // Process records to add computed fields
        const processedRecords = records.map(record => {
            const r = record.toJSON();
            r.category = getCategory(r.actionType);
            r.priority = getPriority(r.actionType);
            r.isFinancial = isFinancial(r.actionType);
            
            if (r.changes && typeof r.changes === 'object') {
                r.extractedAmount = r.changes.amount || r.changes.paymentAmount || r.changes.totalAmount || null;
            }
            
            return r;
        });

        const statistics = calculateStatistics(processedRecords);
        res.json(statistics);

    } catch (error) {
        console.error("Error fetching history statistics:", error);
        res.status(500).json({ message: "Failed to fetch statistics." });
    }
});

// Test route
router.get('/test', requireAuth, async (req, res) => {
    try {
        const tests = {};
        
        tests.historyCount = await TransactionHistory.count();
        
        const sampleHistory = await TransactionHistory.findOne({
            order: [['createdAt', 'DESC']]
        });
        tests.sampleHistory = sampleHistory ? sampleHistory.toJSON() : null;
        
        tests.userCount = await User.count();
        tests.potCount = await Pot.count();
        
        if (sampleHistory && sampleHistory.userId) {
            const user = await User.findByPk(sampleHistory.userId);
            tests.userLookup = user ? 'Success' : 'User not found';
        }
        
        if (sampleHistory && sampleHistory.potIdContext) {
            const pot = await Pot.findByPk(sampleHistory.potIdContext);
            tests.potLookup = pot ? 'Success' : 'Pot not found';
        }

        res.json({
            message: 'Database tests completed',
            tests,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            message: 'Database test failed',
            error: error.message
        });
    }
});

function calculateStatistics(historyItems) {
    const financialActions = historyItems.filter(item => item.isFinancial);
    const totalAmount = financialActions.reduce((sum, item) => {
        const amount = item.extractedAmount || 0;
        return sum + parseFloat(amount || 0);
    }, 0);

    const uniqueUsers = new Set(historyItems.map(item => item.userId)).size;
    const uniquePots = new Set(historyItems.map(item => item.potIdContext).filter(Boolean)).size;
    
    // Calculate today's actions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActions = historyItems.filter(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
    }).length;

    // Action type breakdown
    const actionBreakdown = {};
    historyItems.forEach(item => {
        actionBreakdown[item.actionType] = (actionBreakdown[item.actionType] || 0) + 1;
    });

    // Category breakdown
    const categoryBreakdown = {};
    historyItems.forEach(item => {
        const category = item.category || getCategory(item.actionType);
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });

    // Priority breakdown
    const priorityBreakdown = {
        high: historyItems.filter(item => (item.priority || getPriority(item.actionType)) === 'high').length,
        medium: historyItems.filter(item => (item.priority || getPriority(item.actionType)) === 'medium').length,
        low: historyItems.filter(item => (item.priority || getPriority(item.actionType)) === 'low').length
    };

    return {
        totalRecords: historyItems.length,
        financialActions: financialActions.length,
        totalAmount,
        uniqueUsers,
        uniquePots,
        todayActions,
        actionBreakdown,
        categoryBreakdown,
        priorityBreakdown
    };
}

module.exports = router;