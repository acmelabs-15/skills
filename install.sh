#!/usr/bin/env bash
# Install script for ACMElabs/skills — activates skills under ~/.claude/skills/
# via symlinks (or directory copies with --copy) per ADR-001 F-1.
#
# Idempotent: re-running with existing-and-correct symlinks is a no-op.
#
# Currently activates:
#   - decompose  (SPEC-005)
#   - recompose  (SPEC-005)
#
# Usage:
#   ./install.sh              # symlink mode (default)
#   ./install.sh --copy       # rsync-copy mode (fallback per ADR-001 F-1)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="${HOME}/.claude/skills"

MODE="symlink"
if [[ "${1:-}" == "--copy" ]]; then
  MODE="copy"
fi

mkdir -p "${TARGET_ROOT}"

# Skill directories to activate. Add new entries as additional skills ship.
SKILLS=(
  "decompose"
  "recompose"
)

for skill in "${SKILLS[@]}"; do
  src="${REPO_ROOT}/${skill}"
  dest="${TARGET_ROOT}/${skill}"

  if [[ ! -d "${src}" ]]; then
    echo "skip: source directory not found: ${src}"
    continue
  fi

  if [[ "${MODE}" == "symlink" ]]; then
    if [[ -L "${dest}" ]]; then
      current="$(readlink "${dest}")"
      if [[ "${current}" == "${src}" ]]; then
        echo "ok: ${skill} symlink already correct"
        continue
      fi
      echo "update: removing stale symlink ${dest} -> ${current}"
      rm -f "${dest}"
    elif [[ -e "${dest}" ]]; then
      echo "error: ${dest} exists and is not a symlink; refusing to overwrite"
      exit 1
    fi
    ln -s "${src}" "${dest}"
    echo "linked: ${dest} -> ${src}"
  else
    # --copy mode
    if [[ ! -x "$(command -v rsync)" ]]; then
      echo "error: rsync not found; required for --copy mode"
      exit 1
    fi
    rsync -a --delete "${src}/" "${dest}/"
    echo "copied: ${src}/ -> ${dest}/"
  fi
done

echo "install: complete (${MODE} mode)"
