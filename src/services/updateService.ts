export interface ReleaseInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
  downloadUrl: string | null;
  apkName: string | null;
  releaseDate: string | null;
}

export const CURRENT_APP_VERSION = '1.1.23';

/**
 * Compare two semver strings (e.g., "1.1.23" vs "1.1.22")
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Fetch latest release from GitHub API
 */
export async function checkAppUpdate(): Promise<ReleaseInfo> {
  try {
    const res = await fetch('https://api.github.com/repos/nulis00/KirillGames/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API error (${res.status})`);
    }

    const data = await res.json();
    const tag = (data.tag_name || '').replace(/^v/, '');
    const hasUpdate = compareVersions(tag, CURRENT_APP_VERSION) > 0;

    let downloadUrl: string | null = null;
    let apkName: string | null = null;

    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: { name?: string }) => 
        a.name && a.name.toLowerCase().endsWith('.apk')
      );
      if (apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
        apkName = apkAsset.name;
      }
    }

    if (!downloadUrl && data.html_url) {
      downloadUrl = data.html_url;
    }

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: tag || CURRENT_APP_VERSION,
      changelog: data.body || 'Новые улучшения и исправления ошибок!',
      downloadUrl,
      apkName,
      releaseDate: data.published_at ? data.published_at.slice(0, 10) : null,
    };
  } catch (err) {
    console.warn('Check update error:', err);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      changelog: '',
      downloadUrl: null,
      apkName: null,
      releaseDate: null,
    };
  }
}
