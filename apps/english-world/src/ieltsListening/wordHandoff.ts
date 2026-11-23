export function listeningWordPrefill(search: string) {
  const params = new URLSearchParams(search);
  const word = params.get("englishWord")?.trim(),
    id = params.get("listeningAttempt");
  if (
    !word ||
    word.length > 120 ||
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    return null;
  return {
    englishWord: word,
    englishReference: `/englishWorld/ielts-listening?attempt=${id}`,
  };
}
