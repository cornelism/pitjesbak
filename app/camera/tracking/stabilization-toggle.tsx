export default function StabilizationToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        />
        Enable stabilization
      </label>
      <p className="text-xs text-zinc-400">When off, the first complete reading confirms the roll, even if dice are still moving.</p>
    </div>
  );
}
