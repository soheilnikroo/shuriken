const currentNodeVersion = process.versions.node;
const semver = currentNodeVersion.split('.');
const major = parseInt(semver[0], 10);
if (major < 14) {
  console.error(
    `You are running Node ${currentNodeVersion}.\n` +
      `Shuriken requires Node 14 or higher. \n` +
      `Please update your version of Node.`
  );
  process.exit(1);
}

const runShurikenCli = (): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const shuriken = require('../index.js');
    return shuriken.main();
  } catch (error: unknown) {
    console.error('Failed to load Shuriken:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

runShurikenCli().catch((error: unknown) => {
  console.error('Failed to execute command:', error instanceof Error ? error.message : error);
  process.exit(1);
});
