import { useEffect, useState } from 'react';
import { downloadFile, exportFilename, toCsv } from '../lib/movies';
import { hasLegacyBackup, restoreLegacyBackup } from '../services/migration';

/**
 * Export tools and access to the legacy backup.
 * CSV opens cleanly in Excel, JSON is a full-fidelity backup.
 */
export default function DataActions({ movies, user, onNotice }) {
    const [canRestore, setCanRestore] = useState(false);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (!user) {
            setCanRestore(false);
            return undefined;
        }

        let cancelled = false;
        hasLegacyBackup(user).then((exists) => {
            if (!cancelled) {
                setCanRestore(exists);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleExportCsv = () => {
        // A byte order mark stops Excel from mangling non-ASCII titles.
        downloadFile(exportFilename('csv'), `\uFEFF${toCsv(movies)}`, 'text/csv;charset=utf-8');
        onNotice?.(`Exported ${movies.length} title${movies.length === 1 ? '' : 's'} as CSV.`);
    };

    const handleExportJson = () => {
        downloadFile(exportFilename('json'), JSON.stringify(movies, null, 2), 'application/json');
        onNotice?.(`Exported ${movies.length} title${movies.length === 1 ? '' : 's'} as JSON.`);
    };

    const handleRestore = async () => {
        if (!user) {
            return;
        }
        if (!window.confirm('Restore the pre-migration documents alongside your current collection? This adds them back, it never removes anything.')) {
            return;
        }

        setRestoring(true);
        try {
            const result = await restoreLegacyBackup(user);
            onNotice?.(`Restored ${result.restored} title${result.restored === 1 ? '' : 's'} from the backup.`);
        } catch (error) {
            console.error('Error restoring backup:', error);
            onNotice?.('Could not restore the backup.');
        } finally {
            setRestoring(false);
        }
    };

    const itemClass = 'w-full text-left px-3 py-2.5 text-xs font-light tracking-wide transition-colors disabled:text-[#2a2a2a] disabled:cursor-not-allowed';
    const enabledClass = 'text-[#888] hover:text-white hover:bg-[#151515]';

    return (
        <div className="flex flex-col">
            <button
                onClick={handleExportCsv}
                disabled={movies.length === 0}
                className={`${itemClass} ${enabledClass} disabled:hover:bg-transparent`}
            >
                Export as CSV
            </button>
            <button
                onClick={handleExportJson}
                disabled={movies.length === 0}
                className={`${itemClass} ${enabledClass} border-t border-[#161616] disabled:hover:bg-transparent`}
            >
                Export as JSON
            </button>

            {canRestore && (
                <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className={`${itemClass} ${enabledClass} border-t border-[#161616] disabled:hover:bg-transparent`}
                >
                    {restoring ? 'Restoring...' : 'Restore legacy backup'}
                </button>
            )}
        </div>
    );
}
