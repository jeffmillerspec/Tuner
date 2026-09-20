# CI

`tests.workflow.yml` is the GitHub Actions workflow for the test suite. It lives here
rather than in `.github/workflows/` because the token used for the initial public push
lacked the `workflow` OAuth scope. To enable CI, move it:

    git mv ci/tests.workflow.yml .github/workflows/tests.yml

and push with a token that has the `workflow` scope (`gh auth refresh -s workflow`).
