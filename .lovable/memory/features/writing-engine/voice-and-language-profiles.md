---
name: Voice and Language Profiles
description: Voice Profile removed; Language Level slider (1-7) remains for both modes, controlling prose sophistication
type: feature
---
Voice Profile selector has been removed from the project wizard and generation engine. Natural mode inherently produces unique voices per generation, making explicit voice selection unnecessary.

Language Level slider (1-7) remains functional:
- Level 1: Basic undergraduate (simple sentences)
- Level 4: Masters standard (default)
- Level 7: PhD/publication-grade (maximal density)

The language level is injected into the system prompt and controls prose sophistication for both Default and Natural modes.
