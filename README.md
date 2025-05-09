# 🥷 Shuriken CLI

> A ninja-inspired, modular CLI framework for organizations to manage and extend their own custom tooling with minimal overhead.

---

## 📖 Table of Contents

- [🥷 Shuriken CLI](#-shuriken-cli)
  - [📖 Table of Contents](#-table-of-contents)
  - [Introduction](#introduction)
  - [Why Shuriken? Problems It Solves](#why-shuriken-problems-it-solves)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Bootstrapping New Packages](#bootstrapping-new-packages)
  - [Directory Structure](#directory-structure)
  - [Usage](#usage)
    - [Global Help](#global-help)
    - [Package Commands](#package-commands)
      - [Inspecting Command Details](#inspecting-command-details)
  - [Managing Your Company CLI](#managing-your-company-cli)
  - [Extending Shuriken](#extending-shuriken)
  - [Advanced Topics](#advanced-topics)
    - [Logging](#logging)
    - [Migrations](#migrations)
    - [Debugging](#debugging)
  - [Development \& Contribution](#development--contribution)
  - [License](#license)

---

## Introduction

Shuriken CLI is a **TypeScript-built**, **Inversify-powered**, modular command-line framework designed to help teams build, maintain, and share internal developer tools. Inspired by the precision of ninja tactics, it:

- **Discovers** commands dynamically from your `packages/` folder.
- **Loads** only what you invoke (lazy-loading) for lightning-fast startup.
- **Scaffolds** new packages via a single helper script.
- **Manages** version migrations out of the box.
- **Logs** with colorful, fun, timestamped prefixes.

This means your organization can consolidate all custom CLIs into one repo, define package-level commands, and keep everything maintainable.

---

## Why Shuriken? Problems It Solves

Many organizations struggle with managing internal CLI tools and packages at scale:

- **Manual Setup Overhead**: Each project often has its own scripts and setup steps, leading to inconsistent development environments and steep onboarding for new team members.
- **Version Drift**: Packages can diverge across repositories—one project may use v1.2.0, another v1.3.5—making coordinated upgrades and compatibility guarantees difficult.
- **Fragmented Tooling**: When each team builds and maintains separate CLIs or scripts, duplicative effort increases maintenance costs and decreases discoverability.
- **Migration Pain**: Upgrading package versions can involve manual change logs, bespoke migration scripts per repo, and ad‑hoc rollback procedures.

**Shuriken CLI** addresses these challenges by consolidating all custom tooling into a single, modular framework. You can scaffold new packages, run consistent setup steps, apply version migrations programmatically, and share commands across projects—all with a unified developer experience.

## Features

| Feature                     | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| **Modular Architecture**    | Place any number of packages under `packages/`—Shuriken auto-discovers them.                    |
| **Lazy Command Loading**    | Only the commands you call are loaded into memory, minimizing startup delay.                    |
| **Built‑in Setup & Update** | Core `setup` and `update` commands for installing, configuring, and migrating package versions. |
| **Scaffolding Helper**      | `prepare-package` script bootstraps a new package template with best-practice boilerplate.      |
| **Custom Commands**         | Define additional commands per package (e.g., `component`, `publish`, `deploy`).                |
| **Configurable Logging**    | Ninja‑themed logs with color, timestamps, and fun prefixes.                                     |
| **Pluggable Migrations**    | Author migration scripts under `packages/<pkg>/migrations` for version upgrades.                |

---

## Prerequisites

- **Node.js v14+** (we recommend LTS)
- **pnpm** or npm installed globally
- Git (for cloning and version control)

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/soheilnikroo/shuriken
   cd shuriken
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   # or npm install
   ```

3. **Make `shuriken` globally available**

   ```bash
   pnpm link
   # or npm link
   ```

4. **Verify installation**

   ```bash
   shuriken --version
   ```

---

## Bootstrapping New Packages

Shuriken includes a helper script to scaffold new packages:

```bash
pnpm run prepare-package
```

You will be prompted for:

- **Package name** (e.g., `my-tools`)
- **Display name**
- **Description**
- **Initial version** (default: `1.0.0`)

On completion, a new folder `packages/<package-name>/` is created with:

```
packages/<package-name>/
├── commands/       # Add your command implementations here
│   └── .gitkeep
├── migrations/     # Write version migration scripts
│   └── 1.0.0.ts
├── core/           # Optional utilities (logger, fs, process)
├── index.ts        # Exports package metadata, commands, migrations
└── setup.ts        # Core setup command definition
```

You can then:

```bash
shuriken <package-name> setup
```

---

## Directory Structure

```
root/
├── packages/           # All custom packages live here
│   └── <pkg>/
│       ├── commands/   # Custom command files
│       ├── migrations/ # Version upgrade scripts
│       ├── core/       # Shared utilities for this package
│       ├── index.ts    # Package definition
│       └── setup.ts    # Setup command
├── scripts/
│   └── prepare-package.ts
├── src/                # Core CLI implementation
├── package.json        # Defines build, prepare-package, etc.
├── tsconfig.json       # Paths configured for `@/` and `@packages/`
└── README.md           # This document
```

---

## Usage

### Global Help

```bash
shuriken help
```

Lists every package and its commands. Example output:

```
SHURIKEN CLI — Available Packages

── UI-KIT ─────────────────────
  setup       Install and configure UI components
  update      Migrate UI components to newer versions

── JARVIS ─────────────────────
  component   Generate a React component template

...etc.
```

### Package Commands

Each package exposes commands under `shuriken <package> <command>`.

| Syntax                                  | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| `shuriken <pkg> setup [--pkg-version]`  | Install/configure package (optional version) |
| `shuriken <pkg> update [--version]`     | Run migrations up to latest or specified     |
| `shuriken <pkg> <custom-cmd> [options]` | Any extra commands defined by the package    |

#### Inspecting Command Details

Use `-h` or `help` to see flags and options:

```bash
shuriken <pkg> <command> -h
# or
shuriken help <command>
```

---

## Managing Your Company CLI

Turn this project into your org’s official CLI:

1. **Clone & link locally**
2. **Scaffold packages** via `prepare-package` or by hand
3. **Define commands** in each package’s `commands/` folder
4. **Push changes** to your internal repo or registry

Teams can then install via npm or link to consume the CLI.

---

## Extending Shuriken

1. **Add a new package** under `packages/` (or use scaffolding).

2. Export an `IPackageDefinition` in `index.ts`:

   ```ts
   import { IPackageDefinition } from '@/types';
   import setupCmd from './setup';
   import myCmd from './commands/my-cmd';
   import { migrations } from './migrations';

   const pkg: IPackageDefinition = {
     metadata: { name: 'my-tools', version: '1.0.0', description: 'My custom tools' },
     commands: [setupCmd, myCmd],
     migrations,
   };
   export default pkg;
   ```

3. Implement commands by adhering to `ICommandDefinition`.

4. Write migration scripts implementing `IMigrationDefinition`.

---

## Advanced Topics

### Logging

Shuriken’s `Logger` supports:

- **Levels**: debug, info, warn, error, fatal
- **Fun prefixes**: randomized ninja phrases
- **Timestamps**: ISO‑formatted
- **Color output**: optional

### Migrations

Place files under `packages/<pkg>/migrations` named `<semver>.ts`. They will be executed in ascending order when running `shuriken <pkg> update`.

### Debugging

- Increase verbosity: `--logLevel debug`
- Inspect registry: `~/.shuriken/registry.json`

---

## Development & Contribution

1. **Fork** this repo and clone your fork.
2. `pnpm install && pnpm build`
3. Create feature branches, add tests, and ensure 100% coverage for new code.
4. Commit, push, and open a PR against `main`.
5. Maintain code style: `pnpm run format`, `pnpm run lint`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for governance.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
