## General Guidelines

- Follow PEP 8
- Use meaningful names.
- Keep functions and classes short.
- Use type hints.

## Code Formatting

- 4 spaces per indentation.
- Limit lines to 79 characters.
- Use blank lines to separate functions and classes.
- Use spaces around operators and after commas.

## Naming Conventions

- Variables & functions: `snake_case`
- Constants: `UPPER_CASE`
- Classes: `PascalCase`
- Private: `_prefix`, Protected: `__prefix`

## Imports

- Use absolute imports.
- Order: standard library, third-party, local imports.

## Docstrings & Comments

- Use triple double-quotes (`"""` ... `"""`) for module, class, and function docstrings.
- Start docstrings with a one-line summary.
- Keep inline comments minimal.

## Functions & Methods

- Keep functions short and focused.
- Avoid mutable default arguments.
- Prefer keyword arguments for many parameters.

## Exception Handling

- Use `try-except` wisely.
- Avoid catching generic exceptions.
- Use `logging` instead of `print()`.

## Logging

- Prefer `logging` over `print()`.
- Keep log messages contextual.

## Testing

- Use `pytest` or `unittest`.
- Keep tests small and focused.

## Code Review

- Keep PRs small and focused.
- Use descriptive commit messages.
- Prioritize readability and maintainability.

## Performance & Security

- Use list comprehensions when possible.
- Optimize performance-critical sections.
- Avoid hardcoded secrets.
- Validate user inputs and update dependencies.
