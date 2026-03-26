import Link from 'next/link';

interface SceneSwitchItem {
  key: string;
  label: string;
  description: string;
  href: string;
}

interface SceneSwitchProps {
  items: SceneSwitchItem[];
  activeKey: string;
}

export default function SceneSwitch({ items, activeKey }: SceneSwitchProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(item => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`group min-w-[132px] border px-3 py-2 transition-colors ${
              active
                ? 'border-[#d7d2c3]/50 bg-[#d7d2c3]/10 text-white'
                : 'border-neutral-900 text-neutral-500 hover:border-neutral-700 hover:text-white'
            }`}
          >
            <div className="text-[11px] uppercase tracking-[0.22em]">{item.label}</div>
            <div className="mt-1 text-[11px] leading-5 text-neutral-500 group-hover:text-neutral-300">
              {item.description}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
