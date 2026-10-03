module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // 排除历史 worktree 副本，避免重复计数
  testPathIgnorePatterns: ['/node_modules/', '\\.worktrees/'],
};
