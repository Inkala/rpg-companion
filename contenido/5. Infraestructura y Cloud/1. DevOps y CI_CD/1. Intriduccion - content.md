# Module 1: GitHub Actions Examples

This module contains comprehensive GitHub Actions examples designed for teaching AI/DevOps concepts. Each workflow demonstrates key concepts with real-world scenarios.

## 📋 Table of Contents

1. [Hello World](#1-hello-world)
2. [Parallelism and Sequencing](#2-parallelism-and-sequencing)
3. [Conditionals](#3-conditionals)
4. [JavaScript Library Automation](#4-javascript-library-automation)

## 🎯 Learning Objectives

By studying these examples, students will understand:

- Basic GitHub Actions syntax and structure
- Job dependencies and execution order
- Parallel vs sequential job execution
- Conditional logic and branching strategies
- Real-world CI/CD automation patterns
- Security considerations and best practices

---

## 1. Hello World

**File**: `.github/workflows/01-hello-world.yml`

### 📖 Concepts Demonstrated

- **Basic workflow structure**: name, triggers (on), jobs, steps
- **Runners**: Using `ubuntu-latest` as the execution environment
- **Simple commands**: `echo`, `date`, multi-line scripts
- **GitHub context variables**: `$RUNNER_OS`, `$GITHUB_ACTOR`, etc.
- **Triggers**: push, pull_request, workflow_dispatch
- **outputs**: Passing data between jobs using `$GITHUB_OUTPUT`
- **Reusable actions**: Defining common patterns for reuse


---

## 2. Parallelism and Sequencing

**File**: `.github/workflows/02-parallelism-sequencing.yml`

### 📖 Concepts Demonstrated

- **Job dependencies**: Using `needs` keyword
- **Parallel execution**: Jobs running simultaneously
- **Sequential execution**: Jobs waiting for dependencies
- **Matrix strategies**: Running jobs across multiple configurations
- **Job outputs**: Passing data between jobs
- **Artifact handling**: Sharing data between jobs
---

## 3. Conditionals

**File**: `.github/workflows/03-conditionals.yml`

### 📖 Concepts Demonstrated

- **Basic if statements**: Simple conditional logic
- **Job-level conditions**: Running entire jobs conditionally
- **Step-level conditions**: Running individual steps conditionally
- **Branch detection**: Different behavior for main vs other branches
- **Manual inputs**: Boolean flags to control workflow behavior
- **Always conditions**: Steps that run regardless of failures

---

## 4. JavaScript Library Automation

**File**: `.github/workflows/04-js-library-automation.yml`

### 📖 Concepts Demonstrated

- **Simple CI/CD pipeline** for JavaScript projects
- **Sequential job dependencies** (install → test → build → publish)
- **Conditional publishing** (only when requested or on tags)
- **Basic Node.js setup** and dependency management
- **Build verification** and testing
- **Publication workflow** with proper gating

---
