## Role: You are an impeccable and immaculate TypeScript front end developer!  You are especially knowledgeable and talented in the area of developing with NextJS and Tailwind CSS. 

## Tasks: Please review the documents in `docs` folder about the best practices for working on this project.  Once you're done, compact your memory, come back here, and start on these directives one by one.

## Constraint: the `content` folder is a git submodule, please do not alter anything in the `content` folder.

As always, ask me if you have questions!

## Redesign & Cleanup

This project needs a brief redesign.

1. Update `globals.css` with these new fonts and anywhere else they are applicable (I think in `index.ts`?) Here are the actual packages in `package.json`:
```json . . . 
    "@fontsource-variable/bodoni-moda": "^5.3.0",
    "@fontsource-variable/m-plus-1-code": "^5.3.0",
    "@fontsource-variable/spline-sans": "^5.3.0",
    "@fontsource/architects-daughter": "^5.3.0",
    "@fontsource/libre-barcode-128-text": "^5.3.0",
    "@fontsource/rubik-dirt": "^5.3.0"
```
Assign these fonts to the following:
Headings: "Rubik Dirt"
Barcodes: "Libre Barcode 128 Text"
Sans Serif: "Spline Sans"
Serif: "Bodon Moda"
Monospaced: "M Plus 1 Code"

**For step 2. Use a vision model to test project layout against model website screenshots at each stage before moving on to the next!** [ you may need to compact your memory several times throughout this ordered list. ]

2. Save screenshots of these two websites as references: `https://omp.sh` and `https://github.com/averyfreeman` 
 - Change the layout of the project so it copies the first site,  [https://omp.sh](WEB:OH_MY_PI) - use its layout, header, navbar, footer, and color mode switcher design.  
 - Download the avatar from my GitHub profile [https://github.com/averyfreeman](WEB:GITHUB_AVERYFREEMAN_PROFILE) and use it for an avatar that looks roughly the same as the GitHub site, but **on the right side of the screen** instead of the left [ mirror opposite ].  
 - Create the sidebar from the GitHub page on the right side of this project's site. Remove "Unix Greybeard" moniker. Place the following info from GitHub [ アブリーフリーマン averyfreeman · he/him ] underneath the avatar, in the same order.
 - Place the current hero image underneath the tag line, "Because Everyone Needs A Hobby". Use the barcode font where my name is on the GitHub site (opposite side) and write "UnixGreybeard Dot Org"
 - Replace the tag line with the words, "Anyone who Demonstrates Persistence is Capable of Magic.", using the same 3-line design as the tag line on `https://omp.sh`
3. Make sure viewport breakpoint widths of 1024, 800, 640, 400, 320 display text and elements correctly. [ Note: If DaisyUI has default viewport breakpoints, use them instead.  Flex containers are helpful for dynamic viewport widths. ]  
 - Ensure size of elements reduce dynamically, either fluidly, or at viewport width breakpoints. Ensure site layout either becomes more simple, or elements in the viewport travel further along the vertical plane.   
4. Ensure projected is using Catppuccin Mocha for Dark mode and Catppuccin Frappe for Light mode. Ensure dark mode is DARK for its primary background color - if the theme default is not as dark as Github's dark mode background color, choose a darker color from the palette to use.
5. Ensure all the palette colors are applicable, and fonts are consistent with their use case.
6. Ensure the NextJS dev server runs properly. and you are able to render both the landing pages, and the articles page (and any other page I forgot about).
7. Ensure feature for `tags` or `subjects` [ mutually exclusive name ] are rendered from the YAML front matter to group articles.
8. Ensure articles written in `.md/mdx` format are loading and displaying properly, including attachments, and when choosing / switching between articles.

**This is probably a good point at which to compact your context window, or open a new context before moving forward.** 

## Projects Page

[ UX ] New design and feature plans for the project after it's been "fixed-up".

- Create a **Projects** page based on my github repositories. Make it another MDX loader so I can drop in `.md/mdx` files easily later (like a `README.md`). Use the 5 repositories I have on my "pinned" area that aren't forks. [https://github.com/averyfreeman](WEB:GITHUB_AVERYFREEMAN_PROFILE)


**This is probably a good point at which to compact your context window, or open a new context before moving forward.** 

## Article Word Cloud

- Create a dynamic word cloud from the `Tags` to display on the **Articles** landing page. Word cloud must be made from aggregating the `Tags` descriptor line from each article `.md/mdx` file's YAML front matter. _Must be dynamic so word cloud automatically re-sizes based on current aggregate results._
- Architectural allowance: Word cloud can be "static" in the sense that creating it during NextJS build is OK as long as it's created from _REAL, ACTUAL_ aggregated front matter tag results. [ agent discretion ] Please evaluate the pros/cons to hosting something that updates dynamically after adding `.md/mdx` files to a running system, or rasterized [ etc. ] after aggregating during NextJS build. Provide 3-5 library options and summarize their implementation in no more than 2 paragraphs each. Save plans to a file named `WORD_CLOUD_IDEAS.md` so I can read it outside of the TUI [ too long: do not stream lib options to TUI ].


**This is probably a good point at which to compact your context window, or open a new context before moving forward.** 

## Touchscreen Carousel

- Incorporate a touch-enabled DaisyUI carousel for cycling through articles and projects (aka `.md/mdx` files) that renders on mobile viewport screens (ipad pro: 1024, ipad air: , and a popover or sidebar index (discuss architectural tradeoffs and difficulties for each UX strategy). DaisyUI carousel example: [https://daisyui.com/components/carousel](WEB:DAISY_UI_COMPONENTS_CAROUSEL)

**Respond in the TUI when you're ready.**
