# Teacher Operating System — Version 20.0

## Student Intelligence Engine

This release creates the working student-data foundation that future assessment,
small-group, Teacher Brain, and reporting modules will use.

### Included

- Student roster and searchable student profiles
- Reading, math, and writing group placement
- Red, Yellow, Green, and Blue reading-group dashboard
- Daily local attendance status
- IEP, 504, EL, accommodation, and medical-alert indicators
- Family contacts
- Student goals
- Assessments, interventions, family communication, and teacher notes
- Unified student timeline
- CSV roster import and export
- Local autosave
- Phone, iPad, desktop, and print layouts

### Storage architecture

The engine uses a versioned local-storage record:

`thh:v20:student-intelligence`

No student information is seeded into the release. The roster begins empty.

### Future connection points

The public API is exposed as:

`window.THH_STUDENT_INTELLIGENCE_V200`

Later releases can use this engine to connect students and groups to:

- Teach My Day
- Tier II small-group lessons
- DIBELS and ORF records
- Open Court assessments
- Eureka Math mastery
- intervention reports
- parent-conference summaries
- Teacher Brain recommendations
