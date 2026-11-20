import { useEffect } from 'react'

let lockCount = 0
let savedScrollY = 0
let previousStyles: {
  position: string
  top: string
  width: string
  overflow: string
} | null = null

/**
 * 모달·드로어가 열려 있는 동안 배경 페이지 스크롤을 참조 카운트로 잠근다.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const { body } = document
    if (lockCount === 0) {
      savedScrollY = window.scrollY
      previousStyles = {
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        overflow: body.style.overflow,
      }
      body.style.position = 'fixed'
      body.style.top = `-${savedScrollY}px`
      body.style.width = '100%'
      body.style.overflow = 'hidden'
    }
    lockCount += 1

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0 && previousStyles) {
        body.style.position = previousStyles.position
        body.style.top = previousStyles.top
        body.style.width = previousStyles.width
        body.style.overflow = previousStyles.overflow
        window.scrollTo(0, savedScrollY)
        previousStyles = null
      }
    }
  }, [locked])
}
