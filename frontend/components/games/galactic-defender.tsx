"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Shield, Rocket, Target, Clock, Award, Zap } from "lucide-react"
import type { Threat, GameMetrics } from "@/lib/types"
import { getRandomInt } from "@/lib/utils"

interface GalacticDefenderProps {
  age: number
  onComplete: (metrics: GameMetrics) => void
}

export default function GalacticDefender({ age, onComplete }: GalacticDefenderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"intro" | "countdown" | "playing" | "complete">("intro")
  const [showInstructions, setShowInstructions] = useState(true)
  const [showDemo, setShowDemo] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [threats, setThreats] = useState<Threat[]>([])
  const [health, setHealth] = useState(100)
  const [score, setScore] = useState<number>(0)
  const [shieldEnergy, setShieldEnergy] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [gameTime, setGameTime] = useState(0)
  const [reticleActive, setReticleActive] = useState(false)
  const [impulseErrors, setImpulseErrors] = useState(0)
  const [sustainedFailures, setSustainedFailures] = useState(0)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [movementVariance, setMovementVariance] = useState(0)
  const [lastReticleTime, setLastReticleTime] = useState(0)
  const [beamActive, setBeamActive] = useState(false)
  const [beamTarget, setBeamTarget] = useState<{ x: number; y: number } | null>(null)
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<
    Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      life: number
    }>
  >([])
  const [powerups, setPowerups] = useState<
    Array<{
      id: number
      x: number
      y: number
      type: "shield" | "health" | "energy"
      collected: boolean
    }>
  >([])
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)
  const [showComboText, setShowComboText] = useState(false)
  const [comboText, setComboText] = useState("")
  const [comboTextPosition, setComboTextPosition] = useState({ x: 0, y: 0 })
  const [shake, setShake] = useState(false)
  const [showHitMarker, setShowHitMarker] = useState(false)
  const [hitMarkerPosition, setHitMarkerPosition] = useState({ x: 0, y: 0 })
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; speed: number; twinkle: number }>>([])

  // Game configuration based on age
  const getGameConfig = () => {
    if (age >= 4 && age <= 6) {
      return {
        gameDuration: 120000, // 2 minutes
        threatSpawnRate: 3000, // ms between threats
        threatSpeed: { min: 1, max: 2 },
        reticleBlinkRate: 1500, // ms between blinks
        shieldChargeRate: 2, // energy points per 100ms
        difficultyMultiplier: 0.7,
      }
    } else if (age >= 7 && age <= 12) {
      return {
        gameDuration: 180000, // 3 minutes
        threatSpawnRate: 2000,
        threatSpeed: { min: 1.5, max: 3 },
        reticleBlinkRate: 1200,
        shieldChargeRate: 1.5,
        difficultyMultiplier: 1.0,
      }
    } else {
      return {
        gameDuration: 180000, // 3 minutes
        threatSpawnRate: 1500,
        threatSpeed: { min: 2, max: 4 },
        reticleBlinkRate: 1000,
        shieldChargeRate: 1,
        difficultyMultiplier: 1.3,
      }
    }
  }

  const config = getGameConfig()

  // Initialize stars
  useEffect(() => {
    const newStars = []
    for (let i = 0; i < 100; i++) {
      newStars.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        twinkle: Math.random() * 100,
      })
    }
    setStars(newStars)
  }, [])

  // Initialize game
  const initializeGame = () => {
    setThreats([])
    setHealth(100)
    setScore(0)
    setShieldEnergy(0)
    setImpulseErrors(0)
    setSustainedFailures(0)
    setReactionTimes([])
    setMovementVariance(0)
    setCombo(0)
    setComboTimer(0)
    setParticles([])
    setPowerups([])
    setGameState("countdown")

    // Start countdown
    let count = 5
    setCountdown(count)
    const countdownInterval = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(countdownInterval)
        setStartTime(Date.now())
        setGameTime(0)
        setGameState("playing")
      }
    }, 1000)
  }

  // Create explosion particles
  const createExplosion = (x: number, y: number, color = "#FF5E5E", count = 20) => {
    const newParticles: { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number }[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 3 + 1
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        life: Math.random() * 30 + 20,
      })
    }
    setParticles((prev) => [...prev, ...newParticles])
  }

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicked on a powerup
    const clickedPowerup = powerups.find((p) => !p.collected && Math.hypot(p.x - x, p.y - y) < 25)

    if (clickedPowerup) {
      setPowerups((prev) => prev.map((p) => (p.id === clickedPowerup.id ? { ...p, collected: true } : p)))

      if (clickedPowerup.type === "health") {
        setHealth((prev) => Math.min(100, prev + 15))
        createExplosion(clickedPowerup.x, clickedPowerup.y, "#5EFF8F", 15)
      } else if (clickedPowerup.type === "shield") {
        setShieldEnergy(100)
        createExplosion(clickedPowerup.x, clickedPowerup.y, "#5E9DFF", 15)
      } else if (clickedPowerup.type === "energy") {
        setShieldEnergy((prev) => Math.min(100, prev + 50))
        createExplosion(clickedPowerup.x, clickedPowerup.y, "#FFD700", 15)
      }

      return
    }

    // If shield energy is not full, clicking is an impulse error
    if (shieldEnergy < 100) {
      setImpulseErrors((prev) => prev + 1)
      setCombo(0)
      setComboTimer(0)
      return
    }

    // If reticle is not active, clicking is an impulse error
    if (!reticleActive) {
      setImpulseErrors((prev) => prev + 1)
      setCombo(0)
      setComboTimer(0)
      return
    }

    // Calculate reaction time
    const now = Date.now()
    const reactionTime = now - lastReticleTime
    setReactionTimes((prev) => [...prev, reactionTime])

    // Find the threat that is currently lockable
    const lockableThreat = threats.find((threat) => threat.lockable && !threat.locked && !threat.destroyed)

    if (lockableThreat) {
      // Lock the threat
      setThreats((prev) =>
        prev.map((threat) => (threat.id === lockableThreat.id ? { ...threat, locked: true } : threat)),
      )

      // Fire beam at the threat
      setBeamActive(true)
      setBeamTarget({ x: lockableThreat.x, y: lockableThreat.y })

      // Show hit marker
      setShowHitMarker(true)
      setHitMarkerPosition({ x: lockableThreat.x, y: lockableThreat.y })
      setTimeout(() => setShowHitMarker(false), 300)

      // Reset shield energy
      setShieldEnergy(0)

      // Increase score and combo
      const newCombo = combo + 1
      setCombo(newCombo)
      setComboTimer(30) // Reset combo timer (3 seconds)

      // Add combo text
      if (newCombo > 1) {
        let text = ""
        if (newCombo === 2) text = "Double Hit!"
        else if (newCombo === 3) text = "Triple Hit!"
        else if (newCombo === 4) text = "Quad Hit!"
        else if (newCombo >= 5) text = "Monster Combo!"

        setComboText(text)
        setComboTextPosition({ x: lockableThreat.x, y: lockableThreat.y - 40 })
        setShowComboText(true)
        setTimeout(() => setShowComboText(false), 1000)
      }

      // Calculate score with combo multiplier
      const scoreIncrease = Math.min(newCombo, 5)
      setScore((prev) => prev + scoreIncrease)

      // Add screen shake for powerful hits
      if (newCombo >= 3) {
        setShake(true)
        setTimeout(() => setShake(false), 300)
      }

      // Create explosion particles
      createExplosion(
        lockableThreat.x,
        lockableThreat.y,
        lockableThreat.type === "alien" ? "#9D7AFF" : "#AAA",
        newCombo > 2 ? 30 : 20,
      )

      // After beam animation, destroy the threat
      setTimeout(() => {
        setBeamActive(false)
        setBeamTarget(null)

        setThreats((prev) =>
          prev.map((threat) => (threat.id === lockableThreat.id ? { ...threat, destroyed: true } : threat)),
        )

        // Chance to spawn a powerup
        if (Math.random() < 0.2) {
          const types: Array<"shield" | "health" | "energy"> = ["shield", "health", "energy"]
          const randomType = types[Math.floor(Math.random() * types.length)]

          setPowerups((prev) => [
            ...prev,
            {
              id: Date.now(),
              x: lockableThreat.x,
              y: lockableThreat.y,
              type: randomType,
              collected: false,
            },
          ])
        }
      }, 300)
    }
  }

  // Calculate metrics and call onComplete
  function calculateMetrics() {
    const avgReactionTime =
      reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((acc, t) => acc + t, 0) / reactionTimes.length) : 0
    const metrics: GameMetrics = {
      score,
      health,
      impulseErrors,
      sustainedFailures,
      avgReactionTime,
      movementVariance: Math.round(movementVariance * 100) / 100,
      duration: Math.round(gameTime / 1000),
    }
    onComplete(metrics)
  }

  // Track mouse position for player ship
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== "playing") return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left

      // Only move horizontally within bounds
      if (x > 50 && x < canvas.width - 50) {
        setPlayerPosition((prev) => ({ ...prev, x }))
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [gameState])

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return

    const gameLoop = setInterval(() => {
      const now = Date.now()
      const elapsed = now - startTime
      setGameTime(elapsed)

      // Check if game time is up
      if (elapsed >= config.gameDuration) {
        clearInterval(gameLoop)
        setGameState("complete")
        calculateMetrics()
        return
      }

      // Update stars
      setStars((prev) =>
        prev.map((star) => ({
          ...star,
          y: (star.y + star.speed) % 600,
          twinkle: (star.twinkle + 1) % 100,
        })),
      )

      // Update particles
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 1,
            size: p.life > 10 ? p.size : p.size * 0.9,
          }))
          .filter((p) => p.life > 0),
      )

      // Update powerups
      setPowerups((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.collected ? p.y - 3 : p.y + 1,
          }))
          .filter((p) => p.y > -30 && p.y < 630),
      )

      // Charge shield energy
      setShieldEnergy((prev) => Math.min(100, prev + config.shieldChargeRate))

      // Update combo timer
      if (combo > 0) {
        if (comboTimer > 0) {
          setComboTimer((prev) => prev - 1)
        } else {
          setCombo(0)
        }
      }

      // Spawn new threats
      if (elapsed % config.threatSpawnRate < 100) {
        const newThreat: Threat = {
          id: Date.now(),
          x: getRandomInt(50, canvasRef.current?.width ? canvasRef.current.width - 50 : 750),
          y: -50,
          type: Math.random() > 0.5 ? "alien" : "meteor",
          speed: getRandomInt(config.threatSpeed.min * 10, config.threatSpeed.max * 10) / 10,
          lockable: false,
          locked: false,
          destroyed: false,
        }
        setThreats((prev) => [...prev, newThreat])
      }

      // Make a random threat lockable
      if (elapsed % config.reticleBlinkRate < 100) {
        const unlockableThreats = threats.filter(
          (threat) => !threat.lockable && !threat.locked && !threat.destroyed && threat.y > 50 && threat.y < 400,
        )
        if (unlockableThreats.length > 0) {
          const randomThreat = unlockableThreats[Math.floor(Math.random() * unlockableThreats.length)]
          setThreats((prev) =>
            prev.map((threat) => (threat.id === randomThreat.id ? { ...threat, lockable: true } : threat)),
          )
          setReticleActive(true)
          setLastReticleTime(now)
          setTimeout(() => {
            setReticleActive(false)
            setThreats((prev) => {
              const threat = prev.find((t) => t.id === randomThreat.id)
              if (threat && threat.lockable && !threat.locked && !threat.destroyed) {
                setSustainedFailures((prev) => prev + 1)
                return prev.map((t) => (t.id === randomThreat.id ? { ...t, lockable: false } : t))
              }
              return prev
            })
          }, 1000)
        }
      }

      // Update threats
      setThreats((prev) => {
        const updatedThreats = prev.map((threat) => {
          if (threat.destroyed) {
            return { ...threat, y: threat.y - 10 }
          }
          const newY = threat.y + threat.speed
          if (newY > (canvasRef.current?.height ? canvasRef.current.height : 600) && !threat.destroyed) {
            setHealth((h) => Math.max(0, h - (threat.type === "alien" ? 5 : 10)))
            setCombo(0) // Reset combo when taking damage
            setComboTimer(0)
            setShake(true)
            setTimeout(() => setShake(false), 300)
            return { ...threat, y: newY, destroyed: true }
          }
          return { ...threat, y: newY }
        })
        return updatedThreats.filter(
          (threat) => threat.y > -100 && threat.y < (canvasRef.current?.height ? canvasRef.current.height + 100 : 700),
        )
      })

      // Check if health is depleted
      if (health <= 0) {
        clearInterval(gameLoop)
        setGameState("complete")
        calculateMetrics()
      }

      // Simulate movement variance (for metrics)
      if (Math.random() > 0.9) {
        setMovementVariance((prev) => prev + Math.random() * 0.5)
      }
    }, 100)

    return () => {
      clearInterval(gameLoop)
    }
  }, [gameState, startTime, threats, health, config, reticleActive, combo, comboTimer])

  // Animation loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "countdown") return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Set player position initially
    if (playerPosition.x === 0) {
      setPlayerPosition({ x: width / 2, y: height - 70 })
    }

    let animationFrameId: number

    const render = () => {
      // Space background with gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, "#0b1026")
      bgGradient.addColorStop(1, "#1a2342")
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // Apply screen shake
      if (shake) {
        ctx.save()
        const shakeX = (Math.random() - 0.5) * 10
        const shakeY = (Math.random() - 0.5) * 10
        ctx.translate(shakeX, shakeY)
      }

      // Stars
      stars.forEach((star) => {
        const brightness = 0.5 + Math.sin(star.twinkle / 10) * 0.5
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Nebula clouds (decorative background elements)
      const drawNebula = (x: number, y: number, radius: number, color: string) => {
        const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        nebulaGradient.addColorStop(0, `${color}33`)
        nebulaGradient.addColorStop(1, "transparent")
        ctx.fillStyle = nebulaGradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      drawNebula(150, 150, 100, "#9D7AFF")
      drawNebula(650, 250, 120, "#5E9DFF")
      drawNebula(300, 400, 80, "#FF5E8F")

      if (gameState === "countdown") {
        // Countdown animation
        const countdownSize = 120 + Math.sin(Date.now() / 200) * 20

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, countdownSize + 20, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "rgba(94, 157, 255, 0.2)"
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, countdownSize, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "white"
        ctx.font = "bold 72px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(countdown.toString(), width / 2, height / 2)

        ctx.font = "24px Arial"
        ctx.fillText("Get ready to defend your space outpost!", width / 2, height / 2 + 80)

        // Draw rotating elements around the countdown
        const numElements = 8
        for (let i = 0; i < numElements; i++) {
          const angle = (i / numElements) * Math.PI * 2 + Date.now() / 1000
          const x = width / 2 + Math.cos(angle) * (countdownSize + 40)
          const y = height / 2 + Math.sin(angle) * (countdownSize + 40)

          ctx.fillStyle = i % 2 === 0 ? "#5EFF8F" : "#5E9DFF"
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // Player ship
        const drawPlayerShip = (x: number, y: number) => {
          // Ship body
          ctx.fillStyle = "#5E9DFF"
          ctx.beginPath()
          ctx.moveTo(x, y - 25)
          ctx.lineTo(x - 20, y + 10)
          ctx.lineTo(x + 20, y + 10)
          ctx.closePath()
          ctx.fill()

          // Ship cockpit
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(x, y - 10, 8, 0, Math.PI * 2)
          ctx.fill()

          // Ship wings
          ctx.fillStyle = "#3A4060"
          ctx.beginPath()
          ctx.moveTo(x - 20, y + 10)
          ctx.lineTo(x - 30, y + 20)
          ctx.lineTo(x - 10, y + 10)
          ctx.closePath()
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(x + 20, y + 10)
          ctx.lineTo(x + 30, y + 20)
          ctx.lineTo(x + 10, y + 10)
          ctx.closePath()
          ctx.fill()

          // Engine glow
          const engineGlow = ctx.createRadialGradient(x, y + 15, 0, x, y + 15, 10)
          engineGlow.addColorStop(0, "#FFD700")
          engineGlow.addColorStop(1, "transparent")
          ctx.fillStyle = engineGlow
          ctx.beginPath()
          ctx.arc(x, y + 15, 10, 0, Math.PI * 2)
          ctx.fill()

          // Shield effect when energy is full
          if (shieldEnergy >= 100) {
            const pulseSize = 40 + Math.sin(Date.now() / 100) * 5
            const shieldGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize)
            shieldGradient.addColorStop(0, "rgba(94, 157, 255, 0)")
            shieldGradient.addColorStop(0.7, "rgba(94, 157, 255, 0.1)")
            shieldGradient.addColorStop(1, "rgba(94, 157, 255, 0.3)")

            ctx.fillStyle = shieldGradient
            ctx.beginPath()
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2)
            ctx.fill()

            ctx.strokeStyle = "rgba(94, 157, 255, 0.6)"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        drawPlayerShip(playerPosition.x, height - 70)

        // Threats
        threats.forEach((threat) => {
          if (threat.destroyed) {
            if (threat.y > height - 200) {
              const explosionGradient = ctx.createRadialGradient(threat.x, threat.y, 0, threat.x, threat.y, 30)
              explosionGradient.addColorStop(0, "rgba(255, 200, 50, 0.8)")
              explosionGradient.addColorStop(0.5, "rgba(255, 100, 50, 0.5)")
              explosionGradient.addColorStop(1, "transparent")
              ctx.fillStyle = explosionGradient
              ctx.beginPath()
              ctx.arc(threat.x, threat.y, 30, 0, Math.PI * 2)
              ctx.fill()
            }
            return
          }

          if (threat.type === "alien") {
            // Alien ship with more details
            const time = Date.now() / 500

            // Alien ship body
            ctx.fillStyle = "#9D7AFF"
            ctx.beginPath()
            ctx.ellipse(threat.x, threat.y, 25, 15, 0, 0, Math.PI * 2)
            ctx.fill()

            // Alien ship dome
            const domeGradient = ctx.createRadialGradient(threat.x, threat.y - 5, 0, threat.x, threat.y - 5, 10)
            domeGradient.addColorStop(0, "#FFFFFF")
            domeGradient.addColorStop(1, "#C45EFF")
            ctx.fillStyle = domeGradient
            ctx.beginPath()
            ctx.arc(threat.x, threat.y - 5, 10, 0, Math.PI * 2)
            ctx.fill()

            // Alien ship lights
            const lightColors = ["#FF5E5E", "#5EFF8F", "#5E9DFF"]
            for (let i = 0; i < 3; i++) {
              const angle = (i / 3) * Math.PI * 2 + time
              const lightX = threat.x + Math.cos(angle) * 15
              const lightY = threat.y + Math.sin(angle) * 8

              const lightGlow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 5)
              lightGlow.addColorStop(0, lightColors[i])
              lightGlow.addColorStop(1, "transparent")

              ctx.fillStyle = lightGlow
              ctx.beginPath()
              ctx.arc(lightX, lightY, 5, 0, Math.PI * 2)
              ctx.fill()

              ctx.fillStyle = lightColors[i]
              ctx.beginPath()
              ctx.arc(lightX, lightY, 3, 0, Math.PI * 2)
              ctx.fill()
            }

            // Bottom glow
            const bottomGlow = ctx.createRadialGradient(threat.x, threat.y + 10, 0, threat.x, threat.y + 10, 15)
            bottomGlow.addColorStop(0, "rgba(196, 94, 255, 0.7)")
            bottomGlow.addColorStop(1, "transparent")
            ctx.fillStyle = bottomGlow
            ctx.beginPath()
            ctx.ellipse(threat.x, threat.y + 10, 20, 10, 0, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Meteor with more details and rotation
            const time = Date.now() / 1000
            const rotation = ((threat.id % 100) / 100) * Math.PI * 2 + time

            ctx.save()
            ctx.translate(threat.x, threat.y)
            ctx.rotate(rotation)

            // Meteor body
            const meteorGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20)
            meteorGradient.addColorStop(0, "#AAA")
            meteorGradient.addColorStop(1, "#666")
            ctx.fillStyle = meteorGradient

            ctx.beginPath()
            ctx.moveTo(0, -20)
            ctx.lineTo(15, -10)
            ctx.lineTo(20, 5)
            ctx.lineTo(10, 15)
            ctx.lineTo(-5, 20)
            ctx.lineTo(-15, 10)
            ctx.lineTo(-20, -5)
            ctx.lineTo(-10, -15)
            ctx.closePath()
            ctx.fill()

            // Meteor craters
            ctx.fillStyle = "#555"
            const craterPositions = [
              { x: 5, y: 5, size: 6 },
              { x: -8, y: -3, size: 4 },
              { x: 0, y: -10, size: 5 },
            ]

            craterPositions.forEach((crater) => {
              ctx.beginPath()
              ctx.arc(crater.x, crater.y, crater.size, 0, Math.PI * 2)
              ctx.fill()
            })

            // Meteor trail
            ctx.restore()

            const trailGradient = ctx.createLinearGradient(threat.x, threat.y - 30, threat.x, threat.y + 30)
            trailGradient.addColorStop(0, "transparent")
            trailGradient.addColorStop(0.5, "rgba(255, 100, 50, 0.3)")
            trailGradient.addColorStop(1, "transparent")

            ctx.fillStyle = trailGradient
            ctx.beginPath()
            ctx.moveTo(threat.x - 15, threat.y - 30)
            ctx.lineTo(threat.x + 15, threat.y - 30)
            ctx.lineTo(threat.x + 5, threat.y + 30)
            ctx.lineTo(threat.x - 5, threat.y + 30)
            ctx.closePath()
            ctx.fill()
          }

          if (threat.lockable) {
            const pulseSize = Math.sin(Date.now() / 100) * 3 + 30

            // Outer targeting circle
            ctx.strokeStyle = "#5EFF8F"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(threat.x, threat.y, pulseSize, 0, Math.PI * 2)
            ctx.stroke()

            // Targeting crosshairs
            ctx.beginPath()
            ctx.moveTo(threat.x - pulseSize - 5, threat.y)
            ctx.lineTo(threat.x - pulseSize + 10, threat.y)
            ctx.moveTo(threat.x + pulseSize - 10, threat.y)
            ctx.lineTo(threat.x + pulseSize + 5, threat.y)
            ctx.moveTo(threat.x, threat.y - pulseSize - 5)
            ctx.lineTo(threat.x, threat.y - pulseSize + 10)
            ctx.moveTo(threat.x, threat.y + pulseSize - 10)
            ctx.lineTo(threat.x, threat.y + pulseSize + 5)
            ctx.stroke()

            // Inner targeting circle with pulse
            const innerPulse = Math.sin(Date.now() / 50) * 2 + 10
            ctx.beginPath()
            ctx.arc(threat.x, threat.y, innerPulse, 0, Math.PI * 2)
            ctx.stroke()

            // Target text
            ctx.fillStyle = "#5EFF8F"
            ctx.font = "12px Arial"
            ctx.textAlign = "center"
            ctx.fillText("TARGET LOCKED", threat.x, threat.y - pulseSize - 10)
          }
        })

        // Powerups
        powerups.forEach((powerup) => {
          if (powerup.collected) return

          const time = Date.now() / 500
          const hoverOffset = Math.sin(time) * 5

          // Powerup glow
          let glowColor = ""
          if (powerup.type === "health") glowColor = "#5EFF8F"
          else if (powerup.type === "shield") glowColor = "#5E9DFF"
          else if (powerup.type === "energy") glowColor = "#FFD700"

          const glowGradient = ctx.createRadialGradient(
            powerup.x,
            powerup.y + hoverOffset,
            0,
            powerup.x,
            powerup.y + hoverOffset,
            25,
          )
          glowGradient.addColorStop(0, `${glowColor}80`)
          glowGradient.addColorStop(1, "transparent")

          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(powerup.x, powerup.y + hoverOffset, 25, 0, Math.PI * 2)
          ctx.fill()

          // Powerup icon
          ctx.fillStyle = glowColor
          ctx.beginPath()
          ctx.arc(powerup.x, powerup.y + hoverOffset, 15, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = "#FFFFFF"
          ctx.font = "bold 16px Arial"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          let icon = "+"
          if (powerup.type === "shield") icon = "S"
          else if (powerup.type === "energy") icon = "E"

          ctx.fillText(icon, powerup.x, powerup.y + hoverOffset)

          // Rotating particles
          const numParticles = 8
          for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + time
            const distance = 20
            const particleX = powerup.x + Math.cos(angle) * distance
            const particleY = powerup.y + hoverOffset + Math.sin(angle) * distance

            ctx.fillStyle = glowColor
            ctx.beginPath()
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        })

        // Beam
        if (beamActive && beamTarget) {
          // Beam core
          const beamGradient = ctx.createLinearGradient(playerPosition.x, height - 70, beamTarget.x, beamTarget.y)
          beamGradient.addColorStop(0, "rgba(94, 255, 255, 0.9)")
          beamGradient.addColorStop(1, "rgba(94, 157, 255, 0.7)")

          ctx.strokeStyle = beamGradient
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.moveTo(playerPosition.x, height - 80)
          ctx.lineTo(beamTarget.x, beamTarget.y)
          ctx.stroke()

          // Beam outer glow
          const outerBeamGradient = ctx.createLinearGradient(playerPosition.x, height - 70, beamTarget.x, beamTarget.y)
          outerBeamGradient.addColorStop(0, "rgba(94, 255, 255, 0.5)")
          outerBeamGradient.addColorStop(1, "rgba(94, 157, 255, 0.1)")

          ctx.strokeStyle = outerBeamGradient
          ctx.lineWidth = 12
          ctx.beginPath()
          ctx.moveTo(playerPosition.x, height - 80)
          ctx.lineTo(beamTarget.x, beamTarget.y)
          ctx.stroke()

          // Beam impact
          const impactGradient = ctx.createRadialGradient(beamTarget.x, beamTarget.y, 0, beamTarget.x, beamTarget.y, 25)
          impactGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)")
          impactGradient.addColorStop(0.3, "rgba(94, 157, 255, 0.7)")
          impactGradient.addColorStop(1, "transparent")

          ctx.fillStyle = impactGradient
          ctx.beginPath()
          ctx.arc(beamTarget.x, beamTarget.y, 25, 0, Math.PI * 2)
          ctx.fill()
        }

        // Hit marker
        if (showHitMarker) {
          ctx.strokeStyle = "#FFFFFF"
          ctx.lineWidth = 3

          // X shape
          ctx.beginPath()
          ctx.moveTo(hitMarkerPosition.x - 15, hitMarkerPosition.y - 15)
          ctx.lineTo(hitMarkerPosition.x + 15, hitMarkerPosition.y + 15)
          ctx.moveTo(hitMarkerPosition.x + 15, hitMarkerPosition.y - 15)
          ctx.lineTo(hitMarkerPosition.x - 15, hitMarkerPosition.y + 15)
          ctx.stroke()
        }

        // Combo text
        if (showComboText) {
          ctx.font = "bold 24px Arial"
          ctx.textAlign = "center"
          ctx.fillStyle = "#FFD700"
          ctx.fillText(comboText, comboTextPosition.x, comboTextPosition.y)
        }

        // Particles
        particles.forEach((p) => {
          ctx.fillStyle =
            p.color +
            Math.floor((p.life / 50) * 255)
              .toString(16)
              .padStart(2, "0")
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        })

        // UI: Health bar, Energy bar, Score, Time, Combo
        // Health
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(20, 20, 200, 25)
        ctx.fillStyle = health > 50 ? "#5EFF8F" : health > 25 ? "#FFDD5E" : "#FF5E5E"
        ctx.fillRect(20, 20, health * 2, 25)
        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.strokeRect(20, 20, 200, 25)

        // Health icon and text
        ctx.fillStyle = "#fff"
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "left"
        ctx.fillText("❤️ " + health + "%", 30, 38)

        // Shield
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(20, 55, 200, 25)

        // Pulsing effect when full
        let energyColor = "#5E9DFF"
        if (shieldEnergy === 100) {
          energyColor = Math.floor(Date.now() / 300) % 2 === 0 ? "#5EFF8F" : "#5E9DFF"
        }

        ctx.fillStyle = energyColor
        ctx.fillRect(20, 55, shieldEnergy * 2, 25)
        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.strokeRect(20, 55, 200, 25)

        // Energy icon and text
        ctx.fillStyle = "#fff"
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "left"
        ctx.fillText("⚡ " + Math.floor(shieldEnergy) + "%", 30, 73)

        // Score with animated background when combo is active
        const scoreWidth = 150
        const scoreHeight = 40
        const scoreX = width - scoreWidth - 20
        const scoreY = 20

        if (combo > 0) {
          // Animated background for active combo
          const comboGradient = ctx.createLinearGradient(scoreX, scoreY, scoreX + scoreWidth, scoreY)
          comboGradient.addColorStop(0, "#5E9DFF")
          comboGradient.addColorStop(0.5, "#9D7AFF")
          comboGradient.addColorStop(1, "#FF5E8F")

          ctx.fillStyle = comboGradient
          ctx.fillRect(scoreX, scoreY, scoreWidth, scoreHeight)

          // Combo indicator
          ctx.fillStyle = "#FFD700"
          ctx.font = "bold 16px Arial"
          ctx.textAlign = "center"
          ctx.fillText(`COMBO x${combo}`, scoreX + scoreWidth / 2, scoreY + 60)

          // Combo timer bar
          const timerWidth = (comboTimer / 30) * scoreWidth
          ctx.fillStyle = "#FFD700"
          ctx.fillRect(scoreX, scoreY + scoreHeight + 5, timerWidth, 5)
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.7)"
          ctx.fillRect(scoreX, scoreY, scoreWidth, scoreHeight)
        }

        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.strokeRect(scoreX, scoreY, scoreWidth, scoreHeight)

        // Score text
        ctx.fillStyle = "#FFD700"
        ctx.font = "bold 24px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${score}`, scoreX + scoreWidth / 2, scoreY + 28)

        // Time
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(width - 150 - 20, 70, 150, 30)
        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.strokeRect(width - 150 - 20, 70, 150, 30)

        const timeLeft = Math.max(0, Math.ceil((config.gameDuration - gameTime) / 1000))
        const minutes = Math.floor(timeLeft / 60)
        const seconds = timeLeft % 60

        ctx.fillStyle = "#5EFF8F"
        ctx.font = "bold 18px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, "0")}`, width - 150 / 2 - 20, 70 + 20)

        // Show tip for first 5 seconds
        if (gameTime < 5000) {
          ctx.fillStyle = "rgba(0,0,0,0.7)"
          ctx.fillRect(width / 2 - 250, height - 120, 500, 40)
          ctx.strokeStyle = "#5EFF8F"
          ctx.lineWidth = 2
          ctx.strokeRect(width / 2 - 250, height - 120, 500, 40)

          ctx.fillStyle = "#FFFFFF"
          ctx.font = "bold 18px Arial"
          ctx.textAlign = "center"
          ctx.fillText("Wait for the green circle and full energy, then click the threat!", width / 2, height - 95)
        }
      }

      // Reset shake
      if (shake) {
        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }
    render()
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [
    gameState,
    countdown,
    threats,
    health,
    shieldEnergy,
    score,
    beamActive,
    beamTarget,
    gameTime,
    config,
    playerPosition,
    particles,
    powerups,
    combo,
    comboTimer,
    showComboText,
    comboText,
    comboTextPosition,
    shake,
    showHitMarker,
    hitMarkerPosition,
    stars,
  ])

  // --- UI & Overlays ---
  return (
    <div className="relative w-[800px] h-[600px] mx-auto">
      {/* Instructions Overlay */}
      {showInstructions && (
        <div className="absolute inset-0 bg-[rgba(10,20,40,0.92)] flex items-center justify-center z-10 rounded-3xl">
          <div className="bg-[#222e50] rounded-3xl p-9 text-white shadow-2xl max-w-[450px] text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50"></div>
                <Sparkles className="w-16 h-16 text-yellow-400 relative z-10" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Galactic Defender</h2>
            <ol className="text-left text-lg space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <Target className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <span>
                  Wait for the <span className="font-bold text-green-400">green circle</span> to appear on an alien or
                  meteor.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                <span>
                  Make sure your <span className="font-bold text-blue-400">energy bar</span> is full and glowing.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                <span>
                  <span className="font-bold">Click</span> the threat to blast it with your laser!
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <span>Don't click early, or you'll lose points.</span>
              </li>
              <li className="flex items-start gap-3">
                <Award className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                <span>
                  Chain hits to build <span className="font-bold text-yellow-400">combos</span> for bonus points!
                </span>
              </li>
            </ol>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                onClick={() => setShowDemo(true)}
              >
                Watch Demo
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                onClick={() => {
                  setShowInstructions(false)
                  setGameState("intro")
                }}
              >
                Start Game
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Video Overlay */}
      {showDemo && (
        <div className="absolute inset-0 bg-[rgba(10,20,40,0.92)] flex items-center justify-center z-10 rounded-3xl">
          <div className="bg-[#222e50] rounded-3xl p-8 text-white shadow-2xl max-w-[500px] text-center">
            <div className="rounded-xl overflow-hidden mb-6 border-2 border-blue-500">
              <video src="/placeholder.svg?height=320&width=480" autoPlay loop muted className="w-full" />
            </div>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              onClick={() => setShowDemo(false)}
            >
              Back to Instructions
            </Button>
          </div>
        </div>
      )}

      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="rounded-3xl shadow-2xl bg-[#0b1026] block"
        onClick={handleCanvasClick}
      />

      {/* Game UI Overlay */}
      {gameState === "playing" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Badge
            variant="outline"
            className={`text-lg font-bold px-4 py-1 border-2 ${combo > 0 ? "bg-gradient-to-r from-purple-600 to-pink-500 border-yellow-400" : "bg-black/50 border-gray-500"}`}
          >
            {combo > 0 ? `COMBO x${combo}!` : "READY"}
          </Badge>
        </div>
      )}

      {/* Mascot Tip */}
      {!showInstructions && (
        <div className="absolute left-6 bottom-6 flex items-center gap-3 bg-[rgba(34,46,80,0.8)] rounded-xl px-4 py-2 text-white text-lg z-10">
          <div className="relative w-12 h-12 flex-shrink-0">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50"></div>
            <Rocket className="w-full h-full text-blue-400 relative z-10" />
          </div>
          <span>{gameState === "playing" ? "Tip: Build combos for bonus points!" : "Ready to defend the galaxy?"}</span>
        </div>
      )}

      {/* Start Button on Intro */}
      {gameState === "intro" && !showInstructions && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <h1 className="text-4xl font-bold mb-6 text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Galactic Defender
            </span>
          </h1>
          <p className="text-white/80 mb-8 text-lg max-w-md">
            Protect your space outpost from alien invaders and deadly meteors!
          </p>
          <Button
            size="lg"
            onClick={initializeGame}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-6"
          >
            <Rocket className="mr-2 h-5 w-5" /> Launch Mission
          </Button>
        </div>
      )}

      {/* Game Complete Overlay */}
      {gameState === "complete" && (
        <div className="absolute inset-0 bg-[rgba(10,20,40,0.85)] flex items-center justify-center z-10 rounded-3xl">
          <div className="bg-[#222e50] rounded-3xl p-8 text-white shadow-2xl max-w-[450px] text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500 rounded-full blur-md opacity-50"></div>
                <Award className="w-16 h-16 text-yellow-400 relative z-10" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Mission Complete!</h2>
            <p className="text-white/80 mb-6">Your defense metrics have been recorded.</p>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white/90">Final Score:</span>
                <span className="text-xl font-bold text-yellow-400">{score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/90">Health Remaining:</span>
                <Progress value={health} className="w-32 h-3" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/90">Reaction Time:</span>
                <span className="text-white/90">
                  {reactionTimes.length > 0
                    ? Math.round(reactionTimes.reduce((acc, t) => acc + t, 0) / reactionTimes.length)
                    : 0}{" "}
                  ms
                </span>
              </div>
            </div>

            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              onClick={() => initializeGame()}
            >
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
