const express = require('express');
const cors = require('cors')
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 1337;

app.use(cors({
    origin: '*'
}))
app.use(express.json());

app.get('/teaser/title/:imdbId', async (req, res) => {
    const { imdbId } = req.params;

    try {
        const browser = await puppeteer.launch({
            args: [
                "disable-setuid-sandbox",
                "--no-sandbox",
                "single-process",
                "--disable-gpu",
                "no-zygote"
            ],
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
        });
        const page = await browser.newPage();
        console.log('Browser and page created successfully');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36');
        console.log('User agent set successfully');

        await page.goto(`https://www.imdb.com/title/${imdbId}/`);
        console.log('Navigated to IMDb page');

        const findElement = async (selector) => {
            try {
                await page.waitForSelector(selector);
                return await page.$(selector);
            } catch (error) {
                return null;
            }
        };

        const teaserElement = await findElement(`a[aria-label="Watch Official Trailer"]`);
        if (teaserElement) {
            await teaserElement.click();

            const unmuteButton = await findElement('.jw-icon.jw-icon-display.jw-button-color.jw-reset[aria-label="Play"]');
            if (unmuteButton) {
                await unmuteButton.click();
            }

            const videoElement = await findElement('video.jw-video.jw-reset');

            if (videoElement) {
                const videoSrc = await videoElement.evaluate((el) => el.getAttribute('src'));
                res.status(200).json({ videoSrc });
            } else {
                res.status(404).json({ error: 'Video not found' });
            }
        } else {
            res.status(404).json({ error: 'Teaser not found' });
        }

        await browser.close();
        console.log('Browser closed successfully');
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
