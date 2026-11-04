// Mock module for optional/broken upstream connector dependencies
export default {};
export const signX402Payment = () => Promise.resolve({});
export const toEvmSmartAccount = () => Promise.resolve({});
export const toEvmDelegatedAccount = () => Promise.resolve({});
export const getOrCreateSubscriptionOwnerWallet = () => Promise.resolve({});
export const baseAccount = () => null;
