type SimulationLoopOptions = {
  step: (fixedDeltaTime: number) => void
  render: () => void
  fixedDeltaTime?: number
  maxFrameTime?: number
}

export function createSimulationLoop({
  step,
  render,
  fixedDeltaTime = 1 / 120,
  maxFrameTime = 0.1,
}: SimulationLoopOptions) {
  let animationFrame = 0
  let previousTime: number | null = null
  let accumulator = 0

  const frame = (time: number) => {
    if (previousTime === null) previousTime = time
    const elapsed = Math.min((time - previousTime) / 1000, maxFrameTime)
    previousTime = time
    accumulator += elapsed

    while (accumulator >= fixedDeltaTime) {
      step(fixedDeltaTime)
      accumulator -= fixedDeltaTime
    }

    render()
    animationFrame = requestAnimationFrame(frame)
  }

  return {
    start() {
      if (animationFrame) return
      previousTime = null
      animationFrame = requestAnimationFrame(frame)
    },
    stop() {
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
      previousTime = null
      accumulator = 0
    },
  }
}
