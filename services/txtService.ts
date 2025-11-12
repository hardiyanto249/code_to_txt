import { ProcessedFile } from '../types';

export const generateTxt = (files: ProcessedFile[]): string => {
  let combinedContent = `Project Code Export\n`;
  combinedContent += `========================================\n`;
  combinedContent += `Total Files: ${files.length}\n`;
  combinedContent += `Generated on: ${new Date().toUTCString()}\n`;
  combinedContent += `========================================\n\n`;

  files.forEach((file) => {
    combinedContent += `---------- FILE: ${file.path} ----------\n\n`;
    combinedContent += file.content;
    combinedContent += `\n\n---------- END OF FILE: ${file.path} ----------\n\n\n`;
  });

  return combinedContent;
};
