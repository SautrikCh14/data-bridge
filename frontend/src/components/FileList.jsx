import FileProgress from './FileProgress'

export default function FileList({ files }) {
  if (files.length === 0) return null

  return (
    <div className="file-list" id="file-list">
      {files.map(file => (
        <FileProgress key={file.id} file={file} />
      ))}
    </div>
  )
}
