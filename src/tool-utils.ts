export function normalizeComponentSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

export function installCommandForSlugs(slugs: string[]): string {
  if (slugs.length === 0) {
    return 'npx @shadng/sng-ui add --all';
  }
  return `npx @shadng/sng-ui add ${slugs.join(' ')}`;
}

function normalizeIdentifier(input: string): string {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

type ComponentIdentity = {
  slug: string;
  installName: string;
  selector: string;
  name: string;
};

export function resolveComponentSlug(input: string, components: ComponentIdentity[]): string | null {
  const base = normalizeIdentifier(input);
  if (!base) {
    return null;
  }

  const candidates = new Set<string>([base]);
  if (base.startsWith('sng-')) {
    candidates.add(base.slice(4));
  }
  if (base.startsWith('sng')) {
    candidates.add(base.slice(3));
  }

  const aliasToSlug = new Map<string, string>();
  for (const component of components) {
    const aliases = [
      component.slug,
      component.installName,
      component.selector,
      component.name,
      component.name.replace(/^Sng/, ''),
    ].map(normalizeIdentifier);

    for (const alias of aliases) {
      if (alias) {
        aliasToSlug.set(alias, component.slug);
      }
    }
  }

  for (const candidate of candidates) {
    const match = aliasToSlug.get(candidate);
    if (match) {
      return match;
    }
  }

  return null;
}
