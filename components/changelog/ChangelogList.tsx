"use client";

import { ChangelogEntry } from "./ChangelogEntry";
import type { ChangelogEntryData } from "@/actions/platform-admin/changelog-actions";

interface ChangelogListProps {
  entries: ChangelogEntryData[];
  categoryTranslations?: Record<string, string>;
}

export function ChangelogList({ entries, categoryTranslations }: ChangelogListProps) {
  // Group entries by version
  const groupedByVersion = entries.reduce(
    (acc, entry) => {
      const version = entry.version;
      if (!acc[version]) {
        acc[version] = [];
      }
      acc[version].push(entry);
      return acc;
    },
    {} as Record<string, ChangelogEntryData[]>
  );

  // Sort versions (newest first) using semantic versioning comparison
  const sortedVersions = Object.keys(groupedByVersion).sort((a, b) => {
    const parseVersion = (v: string) => {
      const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
      if (!match) return { major: 0, minor: 0, patch: 0, stage: v };
      return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        stage: match[4] || "",
      };
    };

    const vA = parseVersion(a);
    const vB = parseVersion(b);

    // Compare major, minor, patch in order
    if (vB.major !== vA.major) return vB.major - vA.major;
    if (vB.minor !== vA.minor) return vB.minor - vA.minor;
    if (vB.patch !== vA.patch) return vB.patch - vA.patch;
    
    // Pre-release versions come before release versions
    if (vA.stage && !vB.stage) return 1;
    if (!vA.stage && vB.stage) return -1;
    
    return vB.stage.localeCompare(vA.stage);
  });

  return (
    <div className="relative">
      {sortedVersions.map((version) => {
        const versionEntries = groupedByVersion[version];
        
        // If multiple entries for same version, display them in a group
        return (
          <div key={version} className="mb-8 last:mb-0">
            {versionEntries.length > 1 ? (
              // Multiple entries for same version - show as grouped
              <div className="space-y-0">
                {versionEntries.map((entry, index) => (
                  <ChangelogEntry 
                    key={entry.id} 
                    entry={entry} 
                    index={index} 
                    categoryTranslations={categoryTranslations}
                  />
                ))}
              </div>
            ) : (
              // Single entry
              <ChangelogEntry
                entry={versionEntries[0]}
                index={sortedVersions.indexOf(version)}
                categoryTranslations={categoryTranslations}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
