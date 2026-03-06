import User from "./user.model";

export const generateAccountId = async () => {

    const lastUser = await User.findOne().sort({ createdAt: -1 });
    const currentYear = new Date().getFullYear();

    let lastNumber = 1049; // default start 1050 থেকে

    if (lastUser?.accountId) {
        const [, lastYear, lastNum] = lastUser.accountId.split('-');

        // নতুন বছর হলে reset, না হলে continue
        lastNumber = parseInt(lastYear) === currentYear
            ? parseInt(lastNum)
            : 1049;
    }

    const accountId = `ACC-${currentYear}-${String(lastNumber + 1).padStart(4, '0')}`;
    return accountId;
};