# --- CORRECTED SCRIPT ---

# 1. Create the new directory structure for the 'core' crate.
# This part was correct and should have already run.
# Running it again with -p is safe.
echo "Creating 'core' directory structure..."
mkdir -p core/src

# 2. Move the shared modules from 'cli' to 'core' using the correct paths.
echo "Moving shared modules from 'cli' to 'core'..."
mv cli/components core/src/
mv cli/model core/src/
mv cli/errors.rs core/src/

# Create the main library file for the new 'core' crate.
echo "Creating lib.rs for 'core' crate..."
cat <<EOL > core/src/lib.rs
// [[SECONDARY_MIND_CORE]]/src/lib.rs
// Purpose: Declares the crate's library structure, making modules accessible to consumers.
// Architecture: The root of the core library crate, defining the public API.

pub mod components;
pub mod errors;
pub mod model;
EOL

# Create the Cargo.toml for the new 'core' crate.
echo "Creating Cargo.toml for 'core' crate..."
cat <<EOL > core/Cargo.toml
[package]
name = "secondary-mind-core"
description = "Core engine for the Secondary Mind developer assistant."
version.workspace = true
edition.workspace = true
authors.workspace = true

[dependencies]
# Common dependencies are inherited from the root workspace.
anyhow = { workspace = true }
thiserror = { workspace = true }
git2 = { workspace = true }
swc_core = { workspace = true }
swc_common = { workspace = true }
reqwest = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
log = { workspace = true }
env_logger = { workspace = true }
tokio = { workspace = true }
walkdir = { workspace = true }
regex = { workspace = true }
lazy_static = { workspace = true }
dotenvy = { workspace = true }
EOL


# 3. Clean up the now-redundant directories from 'src-tauri'.
# The 'cli' directories were already moved, so we only need to clean 'src-tauri'.
echo "Cleaning up redundant modules from 'src-tauri'..."
rm -rf src-tauri/src/components
rm -rf src-tauri/src/model
rm -rf src-tauri/src/errors.rs

echo "\n✅ File and directory restructuring complete."
echo "➡️ Next steps: Manually edit your Cargo.toml and .rs files as described in the previous instructions."