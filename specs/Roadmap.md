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
  * [x] Package and publish unentropy CLI
* [x] Simplify the config schema when using $ref. Will likely need to introduce the notion of "id", so that metric can be referenced in a quality gate.
* [x] Support for @collect command
* [x] Integrate find-artifact action into S3-artifact storage
* [x] unentropy preview command
* [x] In-repository docs
* [x] Polish HTML reports: dummy data, crosshair, etc.
* [x] Properly packaged Github actions
 
## 0.3 - MVP+
* [x] Support for selecting time range in metrics report
* [x] Support for zoom-in and reset in metrics report
* [x] Support for parsing Cobertura coverage format
* [x] node/npx compatibility
* [x] Polish quality gate comment
* [x] Use Drizzle ORM and proper migration system

## 0.4 - MVP++
* [x] Public docs
* [ ] Public config schema
* [ ] Non-trackable metrics (affecting quality gate only)
* [ ] Configurable "Main branch"
* [ ] Allow replacing existing build context
* [ ] Cleanup database structure
  * Simplify objects used for data retrieval 
  * Q: do we need the "metric_definitions" table at all?
 
## 0.5 - Alpha
* [ ] Collectors and metrics gallery / showcase / examples
* [ ] Support for more robust, cloud databases (Postgres, MySQL, ...)
* [ ] Improve graph performance for large datasets
* [ ] Minify JS chart code

## TBD
* Garbage collection from metrics database
* What to do when the number of metrics grows too large?
* Custom collectors and metrics / simple plugins
* Plotting multiple metrics in the same chart
  * Configurable in report? Or just static?

## Technical improvements
* [ ] Use DB transactions when collecting metrics
* [ ] Make sure to keep the database connection open for as short a time as possible
* [ ] Proper tests for Storage class
* [ ] Review the tests.
  * Remove redundancy
  * Cleanup the split between contract/integration/unit

## Spec-kit
* [x] Create a contract spec for HTML report template
* [ ] Create a contract spec for GH quality gate comment - how it should look like, what it should contain, etc.

## Long term ideas
* Badges
* Browsing coverage reports (can we still do it with small sqlite storage?)
* Customizable templates
* Templated PR comments
* Heuristic alerts ("Your bundle suddenly increased in size by X%")
