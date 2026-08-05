# Universal Data Studio

Design a modern AI-powered web application called "Universal Data Analyzer (UDA)".

The application is NOT a simple dashboard.

It is a professional data preparation and analysis platform similar in workflow to Power Query, KNIME, Alteryx, and Orange Data Mining, but much simpler and focused on CSV datasets.

============================

DESIGN STYLE

=============================

• Modern SaaS Product

• Premium UI

• Minimalistic

• Dark Theme

• Glassmorphism

• Soft shadows

• Rounded cards (12-16px)

• Blue + Cyan accent colors

• Excellent spacing

• Professional typography

• Smooth hover animations

• Clean enterprise design

The interface should look like software used by data analysts.

NOT like a student project.

======================================================

MAIN WORKFLOW

======================================================

Upload CSV

↓

Dataset Analysis

↓

Data Preprocessing Studio

↓

Visualization

↓

Machine Learning Readiness

↓

Download Clean Dataset

======================================================

LAYOUT

======================================================

Top Navigation

------------------------------------------------

Logo : UDA

Navigation

• Analysis

• Preprocessing

• Visualization

• ML Readiness

Right Side

Dataset Name

Theme Toggle

User Menu

------------------------------------------------

Main Content

======================================================

DATA PREPROCESSING STUDIO

======================================================

This is the core screen.

Use a three-panel workspace.

------------------------------------------------

LEFT PANEL

Title

Operations

Buttons

• Missing Values

• Encoding

• Scaling

• Outliers

• Duplicates

• Feature Selection

• Data Type

Only operation buttons.

Nothing else.

------------------------------------------------

CENTER PANEL

Title

Configuration

The configuration changes dynamically based on the selected operation.

Example

Missing Values

Column Dropdown

Method Dropdown

Add Step Button

Encoding

Column Dropdown

Method Dropdown

Add Step Button

Scaling

Column Dropdown

Method Dropdown

Add Step Button

Only one configuration is visible at a time.

------------------------------------------------

RIGHT PANEL

Title

Pipeline

Display preprocessing steps as modern cards.

Example

────────────────────────

🧹 Missing Values

Column

Age

Method

Median

[Edit]

[Delete]

[Move Up]

[Move Down]

────────────────────────

Below it

Encoding

Column

Sex

Method

One Hot

[Edit]

[Delete]

[Move Up]

[Move Down]

------------------------------------------------

BOTTOM

Large Primary Button

▶ Run Pipeline

After execution

Show

Processed Dataset Preview

Then

Download Clean CSV Button

======================================================

ANALYSIS PAGE

======================================================

Modern cards

Dataset Summary

Dataset Validation

Statistics

AI Insights

Quality Score

ML Readiness

Use beautiful KPI cards.

======================================================

VISUALIZATION PAGE

======================================================

Interactive Charts

Histogram

Scatter Plot

Line Chart

Pie Chart

Box Plot

Correlation Heatmap

Distribution Plot

======================================================

DESIGN PRINCIPLES

======================================================

Large white space

Professional spacing

Consistent paddings

Large buttons

Minimal colors

High readability

Desktop-first

Responsive

No clutter

Every screen should look like premium enterprise software.

======================================================

VISUAL STYLE

======================================================

Inspired by

Power BI

Notion

Linear

Vercel Dashboard

Raycast

Power Query

KNIME

Alteryx

But should NOT copy any existing UI.

Create a unique identity for UDA.

======================================================

GOAL

======================================================

The user should feel like they are using a professional AI Data Preparation Studio, not a simple Streamlit application.

Focus on workflow, productivity, simplicity, and modern SaaS aesthetics.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://csv-mastery-suite.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8b2146ed-ef1a-4633-b1f9-0a46f7acd527).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
