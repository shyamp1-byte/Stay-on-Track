#!/usr/bin/env python3
"""
Test Agent — give it a folder, it reads the code, generates pytest tests via Claude, and runs them.

Usage:
    python test_agent.py app/services
    python test_agent.py app/api/tasks.py
    python test_agent.py app/services app/api
"""

import os
import sys
import subprocess
import textwrap
from pathlib import Path

import anthropic

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
OUTPUT_DIR = Path("generated_tests")
MODEL = "claude-opus-4-6"
MAX_TOKENS = 16000

SYSTEM_PROMPT = textwrap.dedent("""
    You are an expert Python test engineer.
    You will be given the source code of one or more Python files from a FastAPI project.
    Your job is to write a complete, runnable pytest test file that tests the logic in those files.

    Rules:
    - Use pytest. Import only from the standard library, pytest, and unittest.mock.
    - Mock all external dependencies (database sessions, HTTP calls, email sending, the Anthropic API).
    - Use pytest.raises() to test error cases (like ValueError).
    - Each test function must have a clear docstring explaining what it tests.
    - Do NOT import the FastAPI app or spin up a real server — test service and repository functions directly.
    - Do NOT connect to a real database. Use MagicMock() for the db Session.
    - The output must be ONLY valid Python code — no markdown, no ```python fences, no explanations.
    - Start the file with the necessary imports.
    - Aim for high coverage: happy paths, edge cases, and error conditions.
""")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def collect_python_files(paths: list[str]) -> list[Path]:
    """Expand paths (files or directories) into a flat list of .py files."""
    result = []
    for p in paths:
        path = Path(p)
        if not path.exists():
            print(f"  Warning: {p} does not exist, skipping.")
            continue
        if path.is_file() and path.suffix == ".py":
            result.append(path)
        elif path.is_dir():
            result.extend(sorted(path.rglob("*.py")))
    return result


def read_files(py_files: list[Path]) -> str:
    """Concatenate file contents with clear separators for Claude."""
    parts = []
    for f in py_files:
        try:
            content = f.read_text(encoding="utf-8")
            parts.append(f"# === FILE: {f} ===\n{content}")
        except Exception as e:
            parts.append(f"# === FILE: {f} === (could not read: {e})")
    return "\n\n".join(parts)


def generate_tests(source_code: str, source_label: str) -> str:
    """Call Claude and return the generated test code."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Error: ANTHROPIC_API_KEY environment variable is not set.")

    client = anthropic.Anthropic(api_key=api_key)
    print(f"  Sending {len(source_code):,} characters of source code to Claude ({MODEL})...")

    message = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Here is the source code from: {source_label}\n\n"
                    f"{source_code}\n\n"
                    "Write the pytest test file now."
                ),
            }
        ],
    )

    return message.content[0].text.strip()


def derive_test_filename(paths: list[str]) -> str:
    """Turn the input paths into a test file name."""
    parts = []
    for p in paths:
        path = Path(p)
        name = path.stem if path.is_file() else path.name
        parts.append(name.replace("/", "_").replace("\\", "_"))
    return "test_" + "_".join(parts) + ".py"


def run_tests(test_file: Path) -> int:
    """Run pytest on the generated file and return the exit code."""
    print(f"\n  Running: pytest {test_file} -v\n")
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(test_file), "-v", "--tb=short"],
        cwd=Path(__file__).parent,
    )
    return result.returncode


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_paths = sys.argv[1:]
    print(f"\nTest Agent")
    print(f"  Input paths : {', '.join(input_paths)}")

    # 1. Collect files
    py_files = collect_python_files(input_paths)
    if not py_files:
        sys.exit("No Python files found at the given path(s).")
    print(f"  Files found : {len(py_files)}")
    for f in py_files:
        print(f"    {f}")

    # 2. Read source code
    source_code = read_files(py_files)

    # 3. Generate tests via Claude
    print(f"\n  Generating tests...")
    test_code = generate_tests(source_code, ", ".join(input_paths))

    # Strip accidental markdown fences if Claude adds them anyway
    if test_code.startswith("```"):
        lines = test_code.splitlines()
        test_code = "\n".join(
            line for line in lines
            if not line.startswith("```")
        ).strip()

    # 4. Write test file
    OUTPUT_DIR.mkdir(exist_ok=True)
    test_filename = derive_test_filename(input_paths)
    test_file = OUTPUT_DIR / test_filename
    test_file.write_text(test_code, encoding="utf-8")
    print(f"  Test file   : {test_file}")

    # 5. Run tests
    exit_code = run_tests(test_file)

    # 6. Summary
    print()
    if exit_code == 0:
        print("  All tests passed.")
    else:
        print(f"  Some tests failed (pytest exit code {exit_code}).")
        print(f"  Inspect the generated file at: {test_file}")
        print("  You can edit it and re-run with:")
        print(f"    pytest {test_file} -v")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
