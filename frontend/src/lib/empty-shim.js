// Empty shim for optional peer dependencies that are not needed in browser
export function createBaseAccountSDK() {
  return {
    getProvider: () => ({
      request: async () => ({ accounts: [], chainIds: [] }),
      on: () => {},
      removeListener: () => {},
      disconnect: () => {},
    }),
  };
}

export const toClientEvmSigner = () => ({});

const dummy = {
  createBaseAccountSDK,
  toClientEvmSigner,
};

export default dummy;
if (typeof module !== "undefined" && module.exports) {
  module.exports = dummy;
}
