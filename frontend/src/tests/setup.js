import '@testing-library/jest-dom'
import React from 'react'

// Make React available globally so test files don't need to import it.
// The @vitejs/plugin-react automatic JSX runtime handles production code,
// but the jsdom test environment needs this for JSX transformation in tests.
globalThis.React = React
