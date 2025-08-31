const ERC20 = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const LIDO = [
  {
    type: 'function',
    name: 'submit',
    stateMutability: 'payable',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const WSTETH_ABI = [
  {
    type: 'function',
    name: 'wrap',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_stETHAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const SYMBIOTIC_VAULT = [
  {
    type: 'function',
    name: 'collateral',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'onBehalfOf', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { type: 'uint256', name: 'depositedAmount' },
      { type: 'uint256', name: 'mintedShares' },
    ],
  },
] as const;

const ERC4626 = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
] as const;

export { ERC20, LIDO, WSTETH_ABI, SYMBIOTIC_VAULT, ERC4626 };
