const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return 'Invalid Date';
        const utcDate = new Date(Date.UTC(year, month, day));
        if (isNaN(utcDate.getTime())) return 'Invalid Date';
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
        return utcDate.toLocaleDateString('en-US', options);
    }
    return 'Invalid Format';
};


module.exports = {formatDate};