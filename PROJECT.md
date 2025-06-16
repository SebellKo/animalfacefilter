# Project Overview
- **Project**: Animal Face Filter - Real-time face detection with dynamic animal filter overlays and curated asset selection
- **Current Phase**: Simplified Implementation - Animal filter system only with curated character passport photo collection and optimized sizing
- **Tech Stack**: TypeScript, React, Vite, MediaPipe Face Mesh, Canvas 2D API
- **Environment**: Web browser with webcam access required

# File Structure
- src/main.tsx : Entry point for the application, Sets up React rendering and global providers
- src/App.tsx : Root component with mode selector for switching between face mesh and animal filter, Manages application state and routing
- src/components/FaceRecognition.tsx : Original face recognition component with MediaPipe Face Mesh integration, canvas overlay rendering, and mirrored video display
- src/components/AnimalFaceFilter.tsx : Animal filter component with curated selection interface, dynamic face fitting, full animal image overlay without face holes, and optimized animal filter sizing (scale factor 3.3)
- src/App.css : Contains component-specific styles for video container, canvas overlay, mode selector, animal selection grid, and responsive design
- src/assets.json : Contains curated character passport photo collection including animals with various clothing styles (sheep, cat formal transparent, chicken casual updated, cow casual new, panda, giraffe, pig, dog)

# Conversation Context
- **Last Topic**: Asset cleanup - removal of specific character assets (cow_casual_passport)
- **Key Decisions**: Simplified application to focus solely on animal filters, removed tree filter options and related UI components, maintained animal filter scale factor of 3.3 for optimal visual impact, curated asset collection by removing redundant character variations
- **User Context**:
  - Technical Level: Intermediate
  - Preferences: Korean language interface, simplified filter options, intuitive selection interface, full animal image display with larger sizing, clean asset management
  - Communication: Direct requests for feature simplification and UI streamlining

# Implementation Status
## Current State
- **Active Feature**: Animal filter system with curated selection interface, asset management with refined character passport photo collection, full animal image overlay with optimized sizing (scale factor 3.3)
- **Progress**: Complete face detection system, animal filter system with curated selection interface, asset-based rendering system with full image overlay behavior, optimized animal filter sizing, cleaned asset collection
- **Blockers**: None

## Code Evolution
- **Recent Changes**: Removed cow_casual_passport asset from assets.json, maintaining only cow_casual_new variant for cleaner asset collection
- **Working Patterns**: Single filter system with unified interface, asset management with detailed metadata tracking, consistent selection interface for animal filters, optimized sizing parameters for enhanced visual impact, curated asset collection
- **Failed Approaches**: None - successful asset cleanup and curation

# Requirements
- **Implemented**: Real-time face detection, face mesh overlay, animal filter system with full image overlay and larger sizing (scale 3.3), animal selection grid, asset-based rendering system, curated character passport photo collection
- **In Progress**: None - feature complete with simplified animal-only system and curated assets
- **Pending**: Potential additional animal assets or effects
- **Technical Constraints**: Requires camera permissions, modern browser support, CORS-enabled asset loading

# Critical Memory
- **Must Preserve**: MediaPipe Face Mesh configuration, animal filter system architecture, asset management structure, passport photo generation patterns with reference styling, animal selection interface patterns, full image overlay rendering logic, optimized animal filter scale factor (3.3), curated asset collection approach
- **User Requirements**: Korean UI, professional quality assets, consistent styling across character photos, transparent backgrounds for overlay compatibility, intuitive animal selection, full animal image display without face holes, larger animal filter sizing for enhanced visual impact, clean asset management
- **Known Issues**: None

# Next Actions
- **Immediate**: System ready for use with simplified animal filter functionality, optimized sizing, and curated asset collection
- **Open Questions**: Potential for additional animal assets or special effects integration
