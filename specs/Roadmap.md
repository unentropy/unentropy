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
 [x] Support the notion of "collectors" - plugins/scripts that can parse the output of common tools (e.g. clover coverage report)
* [x] Initial metrics gallery - built-in metrics like LOC, coverage, etc.
* [x] First-class support for standard metrics (e.g. "size in bytes", "coverage in %"). 
* [x] Quality gates
* [x] Thresholds
* [x] Separate GH action for quality gate

## 0.2 - MVP
* [ ] Move to a dedicated organization
* [ ] Scaffolding: `npx unentropy init`, an interactive CLI that creates a basic Unentropy configuration based on the current projects.
* [ ] Simplify the config schema when using $ref
* [ ] Support for @collect command
* [ ] Polish quality gate comment, introduce some sort of templating
  * It should be less "dry"
* [ ] Integrate find-artifact action into S3-artifact storage
* [ ] Properly packaged Github actions
* [ ] Allow replacing existing build context
 
## 0.3 - MVP+
* [ ] "Main branch"
* [ ] Custom collectors and metrics / simple plugins
* [ ] Public config schema 
* [ ] Collectors and metrics gallery
* [ ] Use Drizzle ORM and proper migration system

## TBD
* Support for more robust, cloud databases (Postgres, MySQL, ...)
* Templated PR comments
* Garbage collection from metrics database
* What to do when the number of metrics grows too large?
* Heuristic alerts ("Your bundle suddenly increased in size by X%")
* Review the tests.
  * Remove redundancy
  * Cleanup the split between contract/integration/unit

## Technical improvements
* [x] Cleanup queries.js - clear contract
* [ ] Use DB transactions when collecting metrics
* [ ] Make sure to keep the database connection open for as short a time as possible
* [ ] Proper tests for Storage class

## Spec-kit
* [ ] Create a contract spec for GH quailty gate comment - how it should look like, what it should contain, etc.

## Long term ideas
* A website
* Badges
* Browsing coverage reports (can we still do it with small sqlite storage?)
* Customizable templates
