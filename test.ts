import { Manga } from "mangadex-full-api";

// Demo
Manga.search({
  title: 'One Piece',
  limit: Infinity, // API Max is 100 per request, but this function accepts more
  hasAvailableChapters: true,
}).then((mangas) => {
  console.log('There are', mangas.length, 'mangas with One Piece in the title!');
  mangas.forEach((manga) => {
    console.log(JSON.stringify(manga));
  });
});