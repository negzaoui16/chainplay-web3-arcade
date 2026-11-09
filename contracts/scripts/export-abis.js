const fs = require('fs');
const path = require('path');

const cptArtifactPath = path.resolve(__dirname, '../artifacts/contracts/ChainPlayToken.sol/ChainPlayToken.json');
const tmArtifactPath = path.resolve(__dirname, '../artifacts/contracts/TokenManager.sol/TokenManager.json');

const cptArtifact = JSON.parse(fs.readFileSync(cptArtifactPath, 'utf8'));
const tmArtifact = JSON.parse(fs.readFileSync(tmArtifactPath, 'utf8'));

const cptOut = `/**
 * ChainPlayToken (CPT) ERC-20 Smart Contract ABI
 * Strictly typed with as const for Viem / Wagmi inference.
 */

export const ChainPlayTokenABI = ${JSON.stringify(cptArtifact.abi, null, 2)} as const;
`;

const tmOut = `/**
 * TokenManager Smart Contract ABI
 * Strictly typed with as const for Viem / Wagmi inference.
 */

export const TokenManagerABI = ${JSON.stringify(tmArtifact.abi, null, 2)} as const;
`;

const frontendAbiDir = path.resolve(__dirname, '../../frontend/src/contracts/abis');

fs.writeFileSync(path.join(frontendAbiDir, 'ChainPlayTokenABI.ts'), cptOut);
fs.writeFileSync(path.join(frontendAbiDir, 'TokenManagerABI.ts'), tmOut);

console.log('✅ ABIs successfully exported to frontend/src/contracts/abis/');
