export function ConstructionGif() {
  return (
    <div className="flex w-full justify-center items-center">
      <img
        src="/temporary/building.gif"
        alt="Under construction"
        width={360}
        height={270}
        className="w-full max-w-xs md:max-w-md rounded-lg object-contain"
        style={{ pointerEvents: "none", aspectRatio: "4/3" }}
      />
    </div>
  )
}
