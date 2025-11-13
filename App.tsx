import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ProcessedFile } from './types';
import { generateTxt } from './services/txtService';
import { FolderIcon, DocumentArrowDownIcon, SpinnerIcon } from './components/Icons';

// Helper function to convert a wildcard pattern to a regex
const wildcardToRegex = (pattern: string) => {
  // Escape regex special characters, then replace wildcard '*' with '.*'
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = escapedPattern.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`);
};

const App: React.FC = () => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [includeFilter, setIncludeFilter] = useState<string>('');
  const [excludeFilter, setExcludeFilter] = useState<string>('node_modules, .git, dist, build, .vscode, .idea');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (event.target.files) {
      const fileList = Array.from(event.target.files);
      setFiles(fileList);
    }
  };

  useEffect(() => {
    if (!files) {
      setFilteredFiles([]);
      return;
    }

    const excludeFolderPatterns = excludeFilter.split(',').map(p => p.trim()).filter(Boolean);
    const includeFilePatterns = includeFilter.split(',').map(p => p.trim()).filter(Boolean);

    const newFilteredFiles = files.filter(file => {
      const path = (file as any).webkitRelativePath || file.name;

      // Check against exclude folder patterns
      for (const pattern of excludeFolderPatterns) {
        if (path.includes(`/${pattern}/`) || path.startsWith(`${pattern}/`)) {
          return false;
        }
      }

      // Check against include file patterns
      if (includeFilePatterns.length > 0) {
        const fileName = file.name;
        const isIncluded = includeFilePatterns.some(pattern => {
          const regex = wildcardToRegex(pattern);
          return regex.test(fileName);
        });
        if (!isIncluded) {
          return false;
        }
      }

      return true; // Include the file if it passes all checks
    });

    setFilteredFiles(newFilteredFiles);

  }, [files, includeFilter, excludeFilter]);

  const handleGenerate = useCallback(async () => {
    if (!filteredFiles || filteredFiles.length === 0) {
      setError("Tidak ada file yang cocok dengan filter Anda untuk diekspor.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const fileContents = await Promise.all(
        filteredFiles.map(file => {
          return new Promise<ProcessedFile>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                path: (file as any).webkitRelativePath || file.name,
                content: reader.result as string,
              });
            };
            reader.onerror = () => {
              reject(new Error(`Gagal membaca file: ${file.name}`));
            };
            reader.readAsText(file);
          });
        })
      );

      const textContent = generateTxt(fileContents);
      const blob = new Blob([textContent], { type: 'text/plain' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-code-export.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setFiles(null); // Atur ulang setelah berhasil dibuat
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui saat pembuatan dokumen.");
    } finally {
      setIsProcessing(false);
    }
  }, [filteredFiles]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Code to TXT Exporter</h1>
          <p className="text-slate-400 mt-2 text-lg">Ekspor seluruh folder kode ke dalam satu file TXT.</p>
        </header>

        <main className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-6 md:p-8">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-lg p-10 text-center transition-colors duration-300 hover:border-sky-500 hover:bg-slate-800/60">
            <FolderIcon className="w-16 h-16 text-slate-500 mb-4" />
            <h2 className="text-xl font-semibold text-white">Pilih Folder Proyek Anda</h2>
            <p className="text-slate-400 mt-1">Semua file dan sub-folder akan disertakan.</p>
            <p className="text-xs text-slate-500 mt-3">(Paling baik digunakan di Chrome, Edge, atau browser Chromium lainnya)</p>
            <label className="mt-6 cursor-pointer inline-flex items-center px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-500 transition-all duration-200 transform hover:scale-105">
              <span>Cari Folder</span>
              <input
                type="file"
                className="hidden"
                // Atribut 'webkitdirectory' adalah kunci untuk pemilihan folder
                {...{ webkitdirectory: "true", mozdirectory: "true", directory: "true" }}
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
            </label>
          </div>
          
          {error && <p className="text-red-400 text-center mt-4">{error}</p>}

          {files && files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="include-filter" className="block text-sm font-medium text-slate-300 mb-1">
                  Sertakan File (dipisahkan koma)
                </label>
                <input
                  id="include-filter"
                  type="text"
                  value={includeFilter}
                  onChange={(e) => setIncludeFilter(e.target.value)}
                  placeholder="*.js, *.css, package.json"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  aria-describedby="include-helper"
                />
                <p id="include-helper" className="text-xs text-slate-500 mt-1">Gunakan `*` sebagai wildcard. Biarkan kosong untuk menyertakan semua file.</p>
              </div>
              <div>
                <label htmlFor="exclude-filter" className="block text-sm font-medium text-slate-300 mb-1">
                  Kecualikan Folder (dipisahkan koma)
                </label>
                <input
                  id="exclude-filter"
                  type="text"
                  value={excludeFilter}
                  onChange={(e) => setExcludeFilter(e.target.value)}
                  placeholder="node_modules, .git, dist"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  aria-describedby="exclude-helper"
                />
                <p id="exclude-helper" className="text-xs text-slate-500 mt-1">Folder yang cocok dengan nama-nama ini akan dilewati.</p>
              </div>
            </div>
          )}

          {files && files.length > 0 && (
            <div className="mt-6 text-center bg-slate-700/50 p-4 rounded-lg">
              <p className="text-green-400 font-medium">{filteredFiles.length} dari {files.length} file akan diekspor.</p>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleGenerate}
              disabled={!filteredFiles || filteredFiles.length === 0 || isProcessing}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              {isProcessing ? (
                <>
                  <SpinnerIcon className="w-6 h-6 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-6 h-6" />
                  <span>Hasilkan & Unduh .txt</span>
                </>
              )}
            </button>
          </div>
        </main>
        
        <footer className="text-center mt-8 text-slate-500 text-sm">
            <p>Dikembangkan oleh Insinyur React Frontend Senior Kelas Dunia.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
