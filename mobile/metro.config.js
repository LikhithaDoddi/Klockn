const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Firebase 10+ uses package.json `exports` with a `react-native` condition.
// Without this, Metro falls through to the browser bundle, which doesn't
// register the auth component for React Native and throws
// "Component auth has not been registered yet".
config.resolver.unstable_conditionNames = ['require', 'default', 'react-native']

module.exports = config
