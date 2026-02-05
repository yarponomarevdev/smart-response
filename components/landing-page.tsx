"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  Zap,
  FileOutput,
  Target,
  Code2,
  Users,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Check,
  Menu,
  X,
} from "lucide-react"

// Функции-иконки для фичей
const FEATURE_ICONS = {
  adaptive: Zap,
  output: FileOutput,
  scoring: Target,
  nocode: Code2,
}

// Иконки для use cases
const USE_CASE_ICONS = {
  marketers: TrendingUp,
  product: Lightbulb,
  founders: Users,
}

export function LandingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>("")

  // Обработчик клика на кнопку "Войти"
  const handleLoginClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Если пользователь уже авторизован, переходим в админку
      router.push("/admin")
    } else {
      // Если не авторизован, переходим на страницу логина
      router.push("/auth/login")
    }
  }
  
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Следим за скроллом для активной секции
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100
      
      for (const [id, ref] of Object.entries(sectionRefs.current)) {
        if (ref) {
          const offsetTop = ref.offsetTop
          const offsetHeight = ref.offsetHeight
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Плавный скролл к секции
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  const navItems = [
    { id: "features", labelKey: "landing.nav.features" },
    { id: "how-it-works", labelKey: "landing.nav.howItWorks" },
    { id: "use-cases", labelKey: "landing.nav.useCases" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Логотип */}
            <Link href="/" className="font-semibold text-lg">
              SmartResponse.io
            </Link>

            {/* Десктопная навигация */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground",
                    activeSection === item.id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </nav>

            {/* Действия */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <LanguageToggle className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-transparent border-none shadow-none hover:bg-accent hover:text-accent-foreground" />
                <ThemeToggle className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-transparent border-none shadow-none hover:bg-accent hover:text-accent-foreground" />
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLoginClick}
                className="hidden sm:block"
              >
                {t("landing.header.login")}
              </Button>
              
              <Link href="/auth/register">
                <Button size="sm" className="rounded-full">
                  {t("landing.header.getStarted")}
                </Button>
              </Link>

              {/* Мобильное меню */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-4 py-4 space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left text-base font-medium text-muted-foreground hover:text-foreground"
                >
                  {t(item.labelKey)}
                </button>
              ))}
              <div className="flex items-center gap-2 pt-4 border-t">
                <LanguageToggle className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-transparent border-none shadow-none hover:bg-accent hover:text-accent-foreground" />
                <ThemeToggle className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-transparent border-none shadow-none hover:bg-accent hover:text-accent-foreground" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLoginClick}
                  className="ml-auto"
                >
                  {t("landing.header.login")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section
          id="hero"
          ref={(el) => { sectionRefs.current["hero"] = el }}
          className="pt-24 pb-8 sm:pt-32 sm:pb-12"
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-[clamp(2rem,5vw,3.75rem)] leading-[1.1] font-bold tracking-tight mb-6 text-balance">
              {t("landing.hero.title")}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8">
              {t("landing.hero.subtitle")}
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="rounded-full text-base px-8">
                {t("landing.hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={(el) => { sectionRefs.current["how-it-works"] = el }}
        className="py-16 sm:py-24 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("landing.howItWorks.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <Card key={step} className="relative">
                <CardContent className="p-6">
                  <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {step}
                  </div>
                  <h3 className="font-semibold text-lg mt-4 mb-2">
                    {t(`landing.howItWorks.step${step}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`landing.howItWorks.step${step}.description`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={(el) => { sectionRefs.current["features"] = el }}
        className="py-16 sm:py-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("landing.features.title")}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(["adaptive", "output", "scoring", "nocode"] as const).map((feature) => {
              const Icon = FEATURE_ICONS[feature]
              return (
                <Card key={feature}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {t(`landing.features.${feature}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`landing.features.${feature}.description`)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section
        id="use-cases"
        ref={(el) => { sectionRefs.current["use-cases"] = el }}
        className="py-16 sm:py-24 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("landing.useCases.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(["marketers", "product", "founders"] as const).map((role) => {
              const Icon = USE_CASE_ICONS[role]
              return (
                <Card key={role}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {t(`landing.useCases.${role}.title`)}
                    </h3>
                    <p className="text-muted-foreground">
                      {t(`landing.useCases.${role}.description`)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta"
        ref={(el) => { sectionRefs.current["cta"] = el }}
        className="py-16 sm:py-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("landing.cta.title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("landing.cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="rounded-full text-base px-8 w-full sm:w-auto">
                  {t("landing.cta.button")}
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full text-base px-8 w-full sm:w-auto"
                onClick={handleLoginClick}
              >
                {t("landing.cta.login")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        ref={(el) => { sectionRefs.current["faq"] = el }}
        className="py-16 sm:py-24 bg-muted/30"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("landing.faq.title")}
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[1, 2, 3, 4, 5].map((num) => (
              <AccordionItem key={num} value={`item-${num}`}>
                <AccordionTrigger className="text-left">
                  {t(`landing.faq.q${num}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`landing.faq.q${num}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="font-semibold">
              SmartResponse.io
            </div>

            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <button
                onClick={() => scrollToSection("features")}
                className="hover:text-foreground transition-colors"
              >
                {t("landing.nav.features")}
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="hover:text-foreground transition-colors"
              >
                {t("landing.nav.howItWorks")}
              </button>
              <button
                onClick={() => scrollToSection("use-cases")}
                className="hover:text-foreground transition-colors"
              >
                {t("landing.nav.useCases")}
              </button>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                {t("landing.footer.privacy")}
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                {t("landing.footer.terms")}
              </Link>
            </nav>

            <Link href="/auth/register">
              <Button className="rounded-full">
                {t("landing.footer.cta")}
              </Button>
            </Link>
          </div>

          <div className="text-center text-sm text-muted-foreground mt-8">
            © {new Date().getFullYear()} SmartResponse.io. {t("landing.footer.copyright")}
          </div>
        </div>
      </footer>
      </main>
    </div>
  )
}
