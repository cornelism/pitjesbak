export default function PlayAreaToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      />
      Show play area
    </label>
  );
}
