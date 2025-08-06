/**
 * Converts text to title case while preserving abbreviations and Roman numerals
 * @param text - The text to convert
 * @returns Title case text with abbreviations and Roman numerals preserved
 */
export function toTitleCase(text: string): string {
  if (!text) return text;
  
  // List of common abbreviations that should remain uppercase
  const abbreviations = [
    'B.A.V', 'B.A.V.', 'BAV', 'I.T', 'I.T.', 'IT', 'HR', 'PR', 'VIP', 'CEO', 'CTO', 'CFO', 'COO',
    'USA', 'UK', 'UAE', 'API', 'UI', 'UX', 'GPS', 'SMS', 'PDF', 'URL',
    'HTML', 'CSS', 'JS', 'SQL', 'XML', 'JSON', 'HTTP', 'HTTPS', 'FTP',
    'DVD', 'CD', 'TV', 'PC', 'MAC', 'iOS', 'OS', 'AI', 'ML', 'AR', 'VR'
  ];
  
  // Roman numerals pattern (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
  const romanNumeralPattern = /^(I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XL|L|LX{0,3}|XC|C{1,3}|CD|D|DC{0,3}|CM|M{1,3})$/i;
  
  // Check if the entire text is an abbreviation
  if (abbreviations.includes(text.toUpperCase())) {
    return text.toUpperCase();
  }
  
  // Function to process individual parts (handles hyphens and spaces)
  const processWord = (word: string): string => {
    // Check if word is an abbreviation
    if (abbreviations.includes(word.toUpperCase())) {
      return word.toUpperCase();
    }
    
    // Check if word is a Roman numeral
    if (romanNumeralPattern.test(word)) {
      return word.toUpperCase();
    }
    
    // Handle words with dots (like B.A.V, I.T.)
    if (word.includes('.')) {
      // Check if it's a known abbreviation first
      if (abbreviations.includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      
      // Check if it looks like an abbreviation pattern
      const parts = word.split('.');
      const nonEmptyParts = parts.filter(part => part.length > 0);
      
      // If all non-empty parts are 1-3 characters and contain only letters, treat as abbreviation
      const isAbbreviation = nonEmptyParts.length > 0 && 
        nonEmptyParts.every(part => part.length <= 3 && /^[A-Za-z]+$/.test(part));
      
      if (isAbbreviation) {
        return word.toUpperCase();
      }
    }
    
    // Regular title case for normal words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };
  
  // Split by spaces first
  return text
    .split(' ')
    .map(word => {
      // Handle hyphenated words (like HISSAR-I)
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => processWord(part))
          .join('-');
      }
      
      // Process regular words
      return processWord(word);
    })
    .join(' ');
}