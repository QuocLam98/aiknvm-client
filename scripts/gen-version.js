import { writeFileSync } from 'fs'
import { nanoid } from 'nanoid'

writeFileSync('public/version.txt', nanoid())