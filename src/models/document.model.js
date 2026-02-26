export default class Document {
  constructor ({
    text,

    embedding,

    source,

    createdAt = new Date()
  }) {
    this.text = text

    this.embedding = embedding

    this.source = source

    this.createdAt = createdAt
  }
}
