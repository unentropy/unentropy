# Unentropy Roadmap

## 0.1 - PoC: metrics engine 
* [x] MVP 3-step process
* [x] Using GitHub action artifact for storing the metrics database
* [x] JSX templating
* [x] Support for S3-compatible storage (should it be a default?)
  * [x] Storage configurable in the Unentropy config
  * [x] A single, convenient GH action that does it all - downloads db from S3, runs analysis, uploads results back 
* [x] Simple GitHub comment
* [x] Branch comparison: "this PR changes metrics by X% against the main branch"
* [x] Support the notion of "collectors" - plugins/scripts that can parse the output of common tools (e.g. clover coverage report)
* [x] Initial metrics gallery - built-in metrics like LOC, coverage, etc.
* [x] First-class support for standard metrics (e.g. "size in bytes", "coverage in %"). 
* [x] Quality gates
* [x] Thresholds
* [x] Separate GH action for quality gate

## 0.2 - MVP
* [x] Move to a dedicated organization
* [x] Scaffolding: `bunx unentropy init`, an interactive CLI that creates a basic Unentropy configuration based on the current projects.
  * [ ] Package and publish unentropy CLI
* [x] Simplify the config schema when using $ref. Will likely need to introduce the notion of "id", so that metric can be referenced in a quality gate.
* [x] Support for @collect command
* [x] Integrate find-artifact action into S3-artifact storage
* [x] unentropy preview command
* [ ] In-repository docs
* [ ] Polish quality gate comment, make it less dry 
* [ ] Polish HTML reports: dummy data, crosshair, etc.
* [ ] Properly packaged Github actions
 
## 0.3 - MVP+
* [ ] Public docs
* [ ] Use Drizzle ORM and proper migration system
* [ ] "Main branch"
* [ ] Custom collectors and metrics / simple plugins
* [ ] Public config schema 
* [ ] Collectors and metrics gallery
* [ ] Allow replacing existing build context

## TBD
* Support for more robust, cloud databases (Postgres, MySQL, ...)
* Non-trackable metrics (affecting quality gate only)
* Templated PR comments
* Garbage collection from metrics database
* What to do when the number of metrics grows too large?
* Heuristic alerts ("Your bundle suddenly increased in size by X%")

## Technical improvements
* [ ] Use DB transactions when collecting metrics
* [ ] Make sure to keep the database connection open for as short a time as possible
* [ ] Proper tests for Storage class
* [ ] Review the tests.
  * Remove redundancy
  * Cleanup the split between contract/integration/unit

## Spec-kit
* [ ] Create a contract spec for HTML report template
* [ ] Create a contract spec for GH quality gate comment - how it should look like, what it should contain, etc.

## Long term ideas
* A website
* Badges
* Browsing coverage reports (can we still do it with small sqlite storage?)
* Customizable templates
