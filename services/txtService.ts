import { ProcessedFile } from '../types';

const buildFileTree = (files: ProcessedFile[]): object => {
  const tree = {};
  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel: any = tree;
    parts.forEach((part) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {};
      }
      currentLevel = currentLevel[part];
    });
  });
  return tree;
};

const formatTree = (node: any, prefix = ''): string => {
  let result = '';
  const entries = Object.keys(node);
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    result += `${prefix}${connector}${entry}\n`;

    if (Object.keys(node[entry]).length > 0) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      result += formatTree(node[entry], newPrefix);
    }
  });
  return result;
};


export const generateTxt = (files: ProcessedFile[]): string => {
  const fileTree = buildFileTree(files);
  const structureString = formatTree(fileTree);

  let combinedContent = `Project Code Export\n`;
  combinedContent += `========================================\n`;
  combinedContent += `Total Files: ${files.length}\n`;
  combinedContent += `Generated on: ${new Date().toUTCString()}\n`;
  combinedContent += `========================================\n\n`;

  combinedContent += `---------- PROJECT STRUCTURE ----------\n\n`;
  combinedContent += structureString;
  combinedContent += `\n---------- END OF STRUCTURE ----------\n\n\n`;

  files.forEach((file) => {
    combinedContent += `---------- FILE: ${file.path} ----------\n\n`;
    combinedContent += file.content;
    combinedContent += `\n\n---------- END OF FILE: ${file.path} ----------\n\n\n`;
  });

  return combinedContent;
};
