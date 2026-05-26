## Overview

This delta spec covers the removal of the `--followSymlinks` option from the `size` in-process collector. No existing requirements are modified — the symlink-following behavior was exclusively a CLI/contract detail, not a spec-level behavioral requirement.

## ADDED Requirements

None.

## MODIFIED Requirements

None.

## REMOVED Requirements

None.

## Key Entities

- **`get-folder-size` library**: A zero-dependency npm module for calculating file/directory sizes, replacing the custom recursive implementation.
