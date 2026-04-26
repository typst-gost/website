import { createSerializer, parseAsString } from "nuqs/server"

export const fileParam = parseAsString.withDefault("main.typ")
export const serializeParams = createSerializer({ file: fileParam })