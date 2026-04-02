import { useHistory } from 'react-router-dom'

function ProfilePage() {
  const history = useHistory()

  return (
    <section>
      <h2>Profile</h2>
      <button onClick={() => history.push('/settings/billing')}>Go billing</button>
    </section>
  )
}

export default ProfilePage
