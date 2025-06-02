### README


#### issues KB duplicated

# kb is duplicated and shows up on every page, at the bottom

The issue is that the function is finding the wrong closing </div> tag. Looking at your HTML structure, it needs to find the EXACT closing div for the notesContainer. The fix looks for the specific indentation pattern that matches your HTML structure instead of just any </div> tag.
This will now:

Find the exact <div class="notes-grid" id="notesContainer"> opening tag
Look for the properly indented closing </div> that actually closes that container
Replace ONLY the content between those two markers
Not fuck up your navigation or duplicate content

----------------------------

## 🚫 Disable Jekyll on GitHub Pages

GitHub Pages uses [Jekyll](https://jekyllrb.com/) by default to build sites, which can cause issues if your project contains raw `.md`, `.html`, or templating syntax not compatible with Jekyll (e.g., `{{ .Names }}`).

To **disable Jekyll processing** and deploy your files as-is:

### ✅ Step: Add `.nojekyll`

Create an empty file named `.nojekyll` at the root of your publishing branch (usually `main`, `master`, or `docs`):

```bash
touch .nojekyll
git add .nojekyll
git commit -m "Disable Jekyll on GitHub Pages"
git push

--------------------------------------
This tells GitHub Pages to skip the Jekyll build step and serve your files directly.

-------------------------------------


TO DO

start in dark mode
