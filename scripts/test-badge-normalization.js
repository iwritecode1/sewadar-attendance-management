// Test script to verify badge status normalization logic
function normalizeBadgeStatus(badgeStatus) {
  if (badgeStatus) {
    const normalizedStatus = badgeStatus.toUpperCase().trim()
    if (normalizedStatus === 'PERMANENT' || normalizedStatus === 'OPEN') {
      return normalizedStatus
    } else {
      return 'TEMPORARY'
    }
  } else {
    // Default to TEMPORARY if no badge status provided
    return 'TEMPORARY'
  }
}

// Test cases
const testCases = [
  // Valid statuses that should remain unchanged
  { input: 'PERMANENT', expected: 'PERMANENT' },
  { input: 'permanent', expected: 'PERMANENT' },
  { input: 'Permanent', expected: 'PERMANENT' },
  { input: ' PERMANENT ', expected: 'PERMANENT' },
  { input: 'OPEN', expected: 'OPEN' },
  { input: 'open', expected: 'OPEN' },
  { input: 'Open', expected: 'OPEN' },
  { input: ' OPEN ', expected: 'OPEN' },
  
  // Statuses that should become TEMPORARY
  { input: 'TEMPORARY', expected: 'TEMPORARY' },
  { input: 'TEMP', expected: 'TEMPORARY' },
  { input: 'PERM', expected: 'TEMPORARY' },
  { input: 'ACTIVE', expected: 'TEMPORARY' },
  { input: 'INACTIVE', expected: 'TEMPORARY' },
  { input: 'PENDING', expected: 'TEMPORARY' },
  { input: 'EXPIRED', expected: 'TEMPORARY' },
  { input: 'SUSPENDED', expected: 'TEMPORARY' },
  { input: 'NEW', expected: 'TEMPORARY' },
  { input: 'OLD', expected: 'TEMPORARY' },
  { input: 'REGULAR', expected: 'TEMPORARY' },
  { input: 'SPECIAL', expected: 'TEMPORARY' },
  { input: 'UNKNOWN_STATUS', expected: 'TEMPORARY' },
  { input: 'random text', expected: 'TEMPORARY' },
  
  // Edge cases
  { input: '', expected: 'TEMPORARY' },
  { input: null, expected: 'TEMPORARY' },
  { input: undefined, expected: 'TEMPORARY' },
  { input: '   ', expected: 'TEMPORARY' },
]

console.log('🧪 Testing Badge Status Normalization...\n')

let passed = 0
let failed = 0

testCases.forEach((testCase, index) => {
  const result = normalizeBadgeStatus(testCase.input)
  const success = result === testCase.expected
  
  if (success) {
    console.log(`✅ Test ${index + 1}: "${testCase.input}" → "${result}"`)
    passed++
  } else {
    console.log(`❌ Test ${index + 1}: "${testCase.input}" → "${result}" (expected "${testCase.expected}")`)
    failed++
  }
})

console.log(`\n📊 Test Results:`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / testCases.length) * 100)}%`)

if (failed === 0) {
  console.log('\n🎉 All tests passed! Badge status normalization is working correctly.')
} else {
  console.log('\n⚠️  Some tests failed. Please review the normalization logic.')
  process.exit(1)
}

// Example usage in import context
console.log('\n📝 Example Import Data Processing:')
const sampleImportData = [
  { name: 'JOHN DOE', badgeStatus: 'PERMANENT' },
  { name: 'JANE SMITH', badgeStatus: 'open' },
  { name: 'BOB JOHNSON', badgeStatus: 'ACTIVE' },
  { name: 'ALICE BROWN', badgeStatus: 'expired' },
  { name: 'CHARLIE WILSON', badgeStatus: '' },
  { name: 'DIANA DAVIS', badgeStatus: null },
]

sampleImportData.forEach(sewadar => {
  const originalStatus = sewadar.badgeStatus
  const normalizedStatus = normalizeBadgeStatus(sewadar.badgeStatus)
  console.log(`${sewadar.name}: "${originalStatus}" → "${normalizedStatus}"`)
})